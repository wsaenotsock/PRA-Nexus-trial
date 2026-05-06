import type { PRAModel, EventTree, QuantificationResult, SequenceResult, EndStateResult, CutSet } from '@/lib/types';
import { 
  quantifyFaultTree, 
  BDDNode, 
  TRUE_NODE, 
  FALSE_NODE, 
  bddAnd, 
  bddOr, 
  bddNot, 
  buildBDD, 
  calculateProbability, 
  extractMCS, 
  minimizeCutSets, 
  calculateImportanceMeasures,
  resetBDD,
  makeBDDNode,
  getVariableOrder
} from './bdd';

/**
 * Quantifies an Event Tree using BDD logic to support MCS and Importance.
 */
export function quantifyEventTree(
  et: EventTree,
  model: PRAModel
): QuantificationResult {
  const startTime = performance.now();

  // 1. Reset BDD state
  resetBDD();

  // 1. Prepare probability map and variable order using the same logic as Fault Tree engine
  const probabilities = new Map<string, number>();
  
  // Resolve all basic event probabilities first
  model.basicEvents.forEach(be => {
    let p = be.probability;
    if (be.parameterId) {
      const param = model.parameters?.find(p => p.id === be.parameterId);
      if (param) {
        p = param.failureType === 'demand'
          ? param.value * (be.demands ?? 1)
          : param.value * (be.missionTime ?? 24);
      }
    }
    if (p === undefined || p === null) {
      p = be.failureType === 'demand'
        ? (be.failureRate || 0) * (be.demands ?? 1)
        : (be.failureRate || 0) * (be.missionTime || 0); // Use 0 if mission time is not set, or 24? 
        // PRA Nexus convention: if rate is given but no time, we might need a default.
        // But 0 is safer if the user hasn't specified. Let's use 24 for backward compat if needed,
        // but the user likely wants their actual mission time.
    }
    probabilities.set(be.id, Math.min(p || 0, 1));
  });

  const ie = model.initiatingEvents?.find(i => i.id === et.initiatingEventId);
  if (ie) {
    probabilities.set(ie.id, ie.frequency);
  }

  // 2. Build FT BDD Cache (Correctly handling CCF if needed)
  // Note: CCF expansion is complex. To keep it consistent, we should ideally reuse buildBDD 
  // after CCF expansion, but quantifyEventTree currently receives the raw model.
  // For now, let's ensure basic BDD construction is correct.
  const ftBDDCache = new Map<string, BDDNode>();
  const getFTBDD = (ftId: string): BDDNode => {
    if (ftBDDCache.has(ftId)) return ftBDDCache.get(ftId)!;
    const ft = model.faultTrees.find(f => f.id === ftId);
    if (!ft) return FALSE_NODE;
    
    // Use a standard variable order
    const vOrder = getVariableOrder(ft.topGateId, ft.gates, model.basicEvents, model.faultTrees);
    const bdd = buildBDD(ft.topGateId, ft.gates, model.basicEvents, vOrder, model.faultTrees);
    ftBDDCache.set(ftId, bdd);
    return bdd;
  };

  // 3. Initiating Event BDD
  let ieBDD = ie ? makeBDDNode(ie.id, TRUE_NODE, FALSE_NODE) : FALSE_NODE;
  if (ie && ie.linkedFaultTreeId) {
    const ftBDD = getFTBDD(ie.linkedFaultTreeId);
    ieBDD = bddAnd(ieBDD, ftBDD); 
  }

  // 4. Build Sequence BDDs
  const sequenceResults: SequenceResult[] = [];
  const endStateFreqMap = new Map<string, number>();
  const sequenceBDDs: Record<string, any> = {};
  let totalRiskBDD = FALSE_NODE;

  for (const seq of et.sequences) {
    let seqBDD = ieBDD;
    let pathDesc = '';

    for (const decision of seq.path) {
      const fe = et.functionalEvents.find(f => f.id === decision.functionalEventId);
      if (!fe) continue;

      const branch = fe.branches.find(b => b.id === decision.branchId);
      if (!branch) continue;

      const branchDisplay = branch.description || branch.label;
      pathDesc += `${fe.name}(${branchDisplay}) `;

      let branchBDD: BDDNode = FALSE_NODE;
      
      const searchTarget = (branch.label + ' ' + (branch.description || '')).toLowerCase();
      const isSuccess = searchTarget.includes('success') || searchTarget.includes('成功') || searchTarget.includes('ok') || searchTarget.includes('正常');
      const branchIndex = fe.branches.findIndex(b => b.id === decision.branchId);
      const isFirstOrSuccess = isSuccess || (branchIndex === 0 && !searchTarget.includes('fail') && !searchTarget.includes('失敗'));

      if (fe.linkedFaultTreeId) {
        branchBDD = getFTBDD(fe.linkedFaultTreeId);
        if (isFirstOrSuccess) {
          branchBDD = bddNot(branchBDD);
        }
      } else {
        const virtualId = `MANUAL_${fe.id}`;
        // Probability of Success (Branch 0)
        const successProb = fe.branches[0].probability ?? 1.0;
        probabilities.set(virtualId, successProb);
        
        branchBDD = makeBDDNode(virtualId, TRUE_NODE, FALSE_NODE);
        if (branchIndex === 1) {
          // Failure branch is the complement
          branchBDD = bddNot(branchBDD);
        } else if (branchIndex > 1) {
          // Fallback for multi-branch manual
          const multiId = `MANUAL_${fe.id}_B${branchIndex}`;
          probabilities.set(multiId, branch.probability ?? 0);
          branchBDD = makeBDDNode(multiId, TRUE_NODE, FALSE_NODE);
        }
      }

      seqBDD = bddAnd(seqBDD, branchBDD);
    }

    sequenceBDDs[seq.id] = seqBDD;

    const seqFreq = calculateProbability(seqBDD, probabilities);
    
    // Extract MCS for this specific sequence
    const seqRawMCS = extractMCS(seqBDD);
    const seqMinimalMCS = minimizeCutSets(seqRawMCS);
    const seqCutSets: CutSet[] = seqMinimalMCS.map(cs => {
      let prob = 1;
      for (const id of cs) prob *= probabilities.get(id) ?? 0;
      return {
        events: cs,
        probability: prob,
        order: cs.length
      };
    }).sort((a, b) => b.probability - a.probability).slice(0, 50);

    // Calculate importance for this sequence
    const seqImportance = calculateImportanceMeasures(
      seqBDD,
      model.basicEvents,
      seqFreq,
      probabilities
    );

    sequenceResults.push({
      sequenceId: seq.id,
      sequenceName: seq.name || seq.id,
      pathDescription: pathDesc.trim(),
      frequency: seqFreq,
      cutSets: seqCutSets,
      importanceMeasures: seqImportance
    });

    if (seq.endStateId) {
      const es = model.endStates.find(e => e.id === seq.endStateId);
      const categories = es?.categories || [];
      
      // A sequence is Non-Success if it doesn't have an explicit 'success' category
      const isSuccess = categories.length === 1 && 
        (categories[0].toLowerCase() === 'success' || categories[0] === '成功' || categories[0] === 'OK');
      
      if (es && !isSuccess) {
        totalRiskBDD = bddOr(totalRiskBDD, seqBDD);
      }
      
      const current = endStateFreqMap.get(seq.endStateId) || 0;
      endStateFreqMap.set(seq.endStateId, current + seqFreq);
    }
  }

  // 6. Aggregate Results
  const totalNonSuccessFreq = calculateProbability(totalRiskBDD, probabilities);
  const endStateResults: EndStateResult[] = [];
  
  endStateFreqMap.forEach((freq, id) => {
    const es = model.endStates.find(e => e.id === id);
    if (es) {
      const categories = es.categories || [];
      const isSuccess = categories.length === 1 && 
        (categories[0].toLowerCase() === 'success' || categories[0] === '成功' || categories[0] === 'OK');

      endStateResults.push({
        endStateId: id,
        endStateName: es.name,
        category: categories.join(', '),
        frequency: freq,
        cdfContribution: totalNonSuccessFreq > 0 && !isSuccess
          ? (freq / totalNonSuccessFreq) * 100 
          : 0
      });
    }
  });

  endStateResults.sort((a, b) => b.frequency - a.frequency);

  // 7. Extract MCS and Importance for the Total Risk
  const rawMCS = extractMCS(totalRiskBDD);
  const minimalMCS = minimizeCutSets(rawMCS);
  
  const cutSets: CutSet[] = minimalMCS.map(cs => {
    let prob = 1;
    for (const id of cs) prob *= probabilities.get(id) ?? 0;
    return {
      events: cs,
      probability: prob,
      order: cs.length
    };
  }).sort((a, b) => b.probability - a.probability).slice(0, 100);

  const importanceMeasures = calculateImportanceMeasures(
    totalRiskBDD,
    model.basicEvents,
    totalNonSuccessFreq,
    probabilities
  );

  const computeTimeMs = performance.now() - startTime;

  return {
    topEventProbability: totalNonSuccessFreq,
    topEventProbabilityApprox: 0,
    cutSets,
    importanceMeasures,
    totalCDF: totalNonSuccessFreq,
    totalRiskBDD, // Exported for Monte Carlo
    sequenceBDDs,
    endStateResults,
    sequenceResults,
    computeTimeMs,
    method: 'bdd_exact',
    baseProbabilities: Object.fromEntries(probabilities)
  };
}
