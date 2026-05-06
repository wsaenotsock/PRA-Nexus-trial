import { 
  BDDNode, 
  calculateProbability, 
  resetBDD, 
  buildBDD, 
  getVariableOrder,
  makeBDDNode,
  TRUE_NODE,
  FALSE_NODE,
  bddAnd,
  bddOr,
  bddNot,
  extractMCS,
  minimizeCutSets
} from './bdd';
import type { 
  PRAModel, 
  SeismicHazardCurve, 
  SeismicFragility, 
  BasicEvent, 
  QuantificationResult,
  SeismicResult,
  SeismicPointResult,
  EventTree,
  CutSet
} from '@/lib/types';

/**
 * Calculates the failure probability of a component at a given PGA level
 */
function calculateFragilityProbability(pga: number, fragility: SeismicFragility): number {
  if (pga <= 0) return 0;
  
  if (fragility.type === 'discrete' && fragility.points && fragility.points.length > 0) {
    const points = [...fragility.points].sort((a, b) => a.pga - b.pga);
    if (pga <= points[0].pga) return points[0].probability;
    if (pga >= points[points.length - 1].pga) return points[points.length - 1].probability;
    
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i+1];
      if (pga >= p1.pga && pga <= p2.pga) {
        // Linear interpolation
        return p1.probability + (p2.probability - p1.probability) * (pga - p1.pga) / (p2.pga - p1.pga);
      }
    }
    return points[0].probability;
  }

  // Default to lognormal
  const am = fragility.am || 1.0;
  const betaR = fragility.betaR || 0.2;
  const betaU = fragility.betaU || 0.2;
  const betaTot = Math.sqrt(betaR * betaR + betaU * betaU);
  const x = Math.log(pga / am) / betaTot;
  return standardNormalCDF(x);
}

function standardNormalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function erf(x: number): number {
  const a1 =  0.254829592; const a2 = -0.284496736; const a3 =  1.421413741;
  const a4 = -1.453152027; const a5 =  1.061405429; const p  =  0.3275911;
  const sign = (x < 0) ? -1 : 1; x = Math.abs(x);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function getHazardFrequency(pga: number, hazard: SeismicHazardCurve): number {
  const meanFractile = hazard.fractiles.find(f => f.percentile === -1) || hazard.fractiles[0];
  if (!meanFractile) return 0;

  const points = [...meanFractile.points].filter(p => p.pga > 0 && p.frequency > 0).sort((a, b) => a.pga - b.pga);
  if (points.length === 0) return 0;
  if (pga <= points[0].pga) return points[0].frequency;
  if (pga >= points[points.length - 1].pga) return points[points.length - 1].frequency;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]; const p2 = points[i+1];
    if (pga >= p1.pga && pga <= p2.pga) {
      const logF1 = Math.log10(p1.frequency); const logF2 = Math.log10(p2.frequency);
      const logP1 = Math.log10(p1.pga); const logP2 = Math.log10(p2.pga);
      const logP = Math.log10(pga);
      const logF = logF1 + (logF2 - logF1) * (logP - logP1) / (logP2 - logP1);
      return Math.pow(10, logF);
    }
  }
  return points[0].frequency;
}

function buildETUndesirableBDD(et: EventTree, model: PRAModel): BDDNode {
  const ie = model.initiatingEvents?.find(i => i.id === et.initiatingEventId);
  const ftBDDCache = new Map<string, BDDNode>();
  const getFTBDD = (ftId: string): BDDNode => {
    if (ftBDDCache.has(ftId)) return ftBDDCache.get(ftId)!;
    const ft = model.faultTrees.find(f => f.id === ftId);
    if (!ft) return FALSE_NODE;
    const vOrder = getVariableOrder(ft.topGateId, ft.gates, model.basicEvents);
    const bdd = buildBDD(ft.topGateId, ft.gates, model.basicEvents, vOrder);
    ftBDDCache.set(ftId, bdd);
    return bdd;
  };

  let ieBDD = ie ? makeBDDNode(ie.id, TRUE_NODE, FALSE_NODE) : FALSE_NODE;
  if (ie && ie.linkedFaultTreeId) ieBDD = bddAnd(ieBDD, getFTBDD(ie.linkedFaultTreeId));

  let etRiskBDD = FALSE_NODE;
  for (const seq of et.sequences) {
    const es = model.endStates.find(e => e.id === seq.endStateId);
    if (!es) continue;
    const categories = es.categories || [];
    const isSuccess = categories.length === 1 && (categories[0].toLowerCase() === 'success' || categories[0] === '成功' || categories[0] === 'ok');
    if (isSuccess) continue;

    let seqBDD = ieBDD;
    for (const decision of seq.path) {
      const fe = et.functionalEvents.find(f => f.id === decision.functionalEventId);
      if (!fe) continue;
      const branchIndex = fe.branches.findIndex(b => b.id === decision.branchId);
      const branch = fe.branches[branchIndex];
      const searchTarget = (branch.label + ' ' + (branch.description || '')).toLowerCase();
      const isBranchSuccess = searchTarget.includes('success') || searchTarget.includes('成功') || searchTarget.includes('ok');

      let branchBDD: BDDNode = FALSE_NODE;
      if (fe.linkedFaultTreeId) {
        branchBDD = getFTBDD(fe.linkedFaultTreeId);
        if (isBranchSuccess || (branchIndex === 0 && !searchTarget.includes('fail'))) branchBDD = bddNot(branchBDD);
      } else {
        const virtualId = `MANUAL_${fe.id}`;
        branchBDD = makeBDDNode(virtualId, TRUE_NODE, FALSE_NODE);
        if (branchIndex === 1) branchBDD = bddNot(branchBDD);
      }
      seqBDD = bddAnd(seqBDD, branchBDD);
    }
    etRiskBDD = bddOr(etRiskBDD, seqBDD);
  }
  return etRiskBDD;
}

export function quantifySeismic(dummyId: string, model: PRAModel): QuantificationResult {
  const startTime = performance.now();
  const settings = model.seismicSettings;
  const hazard = model.seismicHazards.find(h => h.id === settings.hazardCurveId);
  if (!hazard) throw new Error('Invalid Hazard Curve selection');
  
  const selectedETs = model.eventTrees.filter(et => settings.selectedETIds.includes(et.id));
  if (selectedETs.length === 0) throw new Error('No Event Trees selected');

  resetBDD();
  let totalRiskBDD = FALSE_NODE;
  for (const et of selectedETs) {
    totalRiskBDD = bddOr(totalRiskBDD, buildETUndesirableBDD(et, model));
  }

  // Determine if uncertainty analysis is requested
  const isUncertainty = settings.uncertaintyEnabled && (settings.samples === undefined || settings.samples > 1);
  
  if (isUncertainty) {
    return runSeismicMonteCarlo(totalRiskBDD, model, settings, hazard, selectedETs, startTime);
  }

  // Standard point-estimate quantification (using Mean curve)
  const meanFractile = hazard.fractiles.find(f => f.percentile === -1) || hazard.fractiles[0];
  const result = quantifyAtHazardFractile(totalRiskBDD, model, settings, meanFractile, selectedETs);
  
  const computeTimeMs = performance.now() - startTime;
  return {
    ...result,
    topEventProbabilityApprox: result.topEventProbability,
    importanceMeasures: [],
    computeTimeMs,
    method: 'seismic_integration',
    seismicResult: { 
      totalFrequency: result.topEventProbability, 
      curve: result.curve, 
      cutSets: result.cutSets 
    },
  };
}

/**
 * Quantifies risk for a single hazard fractile
 */
function quantifyAtHazardFractile(
  totalRiskBDD: BDDNode, 
  model: PRAModel, 
  settings: any, 
  hazardFractile: any, 
  selectedETs: EventTree[],
  sampledFragilities?: Map<string, number> // am values
): any {
  const { minPGA, maxPGA, intervals } = settings;
  const pgaStep = (maxPGA - minPGA) / intervals;
  let totalFrequency = 0;
  const seismicCurve: SeismicPointResult[] = [];

  const rawMCS = extractMCS(totalRiskBDD);
  const minimalMCS = minimizeCutSets(rawMCS);
  const mcsIntegratedFreq = new Map<string, number>();
  minimalMCS.forEach(cs => mcsIntegratedFreq.set(cs.join('|'), 0));

  for (let i = 0; i < intervals; i++) {
    const pgaStart = minPGA + i * pgaStep;
    const pgaEnd = pgaStart + pgaStep;
    const pgaMid = (pgaStart + pgaEnd) / 2;
    
    const freqStart = getHazardFrequencyAtFractile(pgaStart, hazardFractile);
    const freqEnd = getHazardFrequencyAtFractile(pgaEnd, hazardFractile);
    const deltaH = Math.max(0, freqStart - freqEnd);
    if (deltaH <= 0) continue;

    const probsAtPGA = new Map<string, number>();
    for (const be of model.basicEvents) {
      const pRandom = be.probability ?? 0;
      let pTotal = pRandom;
      if (be.seismicFragilityId) {
        const fragility = model.seismicFragilities.find(f => f.id === be.seismicFragilityId);
        if (fragility) {
          const am = sampledFragilities?.get(be.seismicFragilityId) || fragility.am || 1.0;
          const betaR = sampledFragilities ? (fragility.betaR || 0.2) : Math.sqrt((fragility.betaR || 0.2)**2 + (fragility.betaU || 0.2)**2);
          
          const x = Math.log(pgaMid / am) / betaR;
          const pSeismic = standardNormalCDF(x);
          pTotal = 1 - (1 - pSeismic) * (1 - pRandom);
        }
      }
      probsAtPGA.set(be.id, pTotal);
    }
    
    for (const ie of model.initiatingEvents) probsAtPGA.set(ie.id, 1.0);
    for (const et of selectedETs) {
      for (const fe of et.functionalEvents) {
        if (!fe.linkedFaultTreeId) {
          probsAtPGA.set(`MANUAL_${fe.id}`, fe.branches[0].probability ?? 1.0);
        }
      }
    }

    const pFailure = calculateProbability(totalRiskBDD, probsAtPGA);
    const intervalContribution = pFailure * deltaH;
    totalFrequency += intervalContribution;

    const pointCutSets: CutSet[] = minimalMCS.map(cs => {
      let prob = 1;
      for (const id of cs) prob *= probsAtPGA.get(id) ?? 0;
      const key = cs.join('|');
      mcsIntegratedFreq.set(key, (mcsIntegratedFreq.get(key) || 0) + prob * deltaH);
      return { events: cs, probability: prob, order: cs.length };
    }).sort((a, b) => b.probability - a.probability).slice(0, 10);

    seismicCurve.push({
      pga: parseFloat(pgaMid.toFixed(3)),
      frequency: deltaH,
      hazardFreq: getHazardFrequencyAtFractile(pgaMid, hazardFractile),
      ccdp: pFailure,
      contribution: intervalContribution,
      cutSets: pointCutSets
    });
  }

  const overallCutSets: CutSet[] = minimalMCS.map(cs => ({
    events: cs,
    probability: mcsIntegratedFreq.get(cs.join('|')) || 0,
    order: cs.length
  })).sort((a, b) => b.probability - a.probability).slice(0, 50);

  return {
    topEventProbability: totalFrequency,
    curve: seismicCurve,
    cutSets: overallCutSets
  };
}

function getHazardFrequencyAtFractile(pga: number, fractile: any): number {
  const points = [...fractile.points].filter(p => p.pga > 0 && p.frequency > 0).sort((a, b) => a.pga - b.pga);
  if (points.length === 0) return 0;
  if (pga <= points[0].pga) return points[0].frequency;
  if (pga >= points[points.length - 1].pga) return points[points.length - 1].frequency;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]; const p2 = points[i+1];
    if (pga >= p1.pga && pga <= p2.pga) {
      const logF1 = Math.log10(p1.frequency); const logF2 = Math.log10(p2.frequency);
      const logP1 = Math.log10(p1.pga); const logP2 = Math.log10(p2.pga);
      const logP = Math.log10(pga);
      const logF = logF1 + (logF2 - logF1) * (logP - logP1) / (logP2 - logP1);
      return Math.pow(10, logF);
    }
  }
  return 0;
}

function runSeismicMonteCarlo(
  totalRiskBDD: BDDNode, 
  model: PRAModel, 
  settings: any, 
  hazard: any, 
  selectedETs: EventTree[],
  startTime: number
): QuantificationResult {
  const samples = settings.samples || 1000;
  const trialTotalResults: number[] = [];
  const trialCurves: any[][] = [];
  
  const fractiles = hazard.fractiles.filter((f: any) => f.percentile >= 0).sort((a: any, b: any) => a.percentile - b.percentile);
  if (fractiles.length === 0) {
    fractiles.push(hazard.fractiles[0]);
  }

  for (let s = 0; s < samples; s++) {
    const rHazard = Math.random();
    let selectedFractile = fractiles[fractiles.length - 1];
    for (let i = 0; i < fractiles.length; i++) {
      if (rHazard <= fractiles[i].percentile) {
        selectedFractile = fractiles[i];
        break;
      }
    }

    const sampledAmMap = new Map<string, number>();
    for (const fragility of model.seismicFragilities) {
      if (fragility.type === 'lognormal' || !fragility.type) {
        const am = fragility.am || 1.0;
        const betaU = fragility.betaU || 0.001;
        const z = boxMullerTransform();
        const sampledAm = am * Math.exp(z * betaU);
        sampledAmMap.set(fragility.id, sampledAm);
      }
    }

    const trialRes = quantifyAtHazardFractile(totalRiskBDD, model, settings, selectedFractile, selectedETs, sampledAmMap);
    trialTotalResults.push(trialRes.topEventProbability);
    trialCurves.push(trialRes.curve);
  }

  trialTotalResults.sort((a, b) => a - b);
  const mean = trialTotalResults.reduce((a, b) => a + b, 0) / samples;
  const medianTotal = trialTotalResults[Math.floor(samples * 0.5)];
  const p05Total = trialTotalResults[Math.floor(samples * 0.05)];
  const p95Total = trialTotalResults[Math.floor(samples * 0.95)];

  // Calculate fractile curves for each PGA point
  const intervals = settings.intervals;
  const fractileCurves: { percentile: number, curve: any[] }[] = [
    { percentile: -1, curve: [] }, // Mean
    { percentile: 0.05, curve: [] },
    { percentile: 0.5, curve: [] },
    { percentile: 0.95, curve: [] }
  ];

  for (let i = 0; i < intervals; i++) {
    const contributions = trialCurves.map(c => c[i]?.contribution || 0);
    contributions.sort((a, b) => a - b);
    
    const pga = trialCurves[0][i]?.pga || 0;
    const hFreq = trialCurves[0][i]?.hazardFreq || 0;

    const meanVal = contributions.reduce((a, b) => a + b, 0) / samples;
    const p05Val = contributions[Math.floor(samples * 0.05)];
    const p50Val = contributions[Math.floor(samples * 0.5)];
    const p95Val = contributions[Math.floor(samples * 0.95)];

    fractileCurves[0].curve.push({ pga, contribution: meanVal, hazardFreq: hFreq });
    fractileCurves[1].curve.push({ pga, contribution: p05Val, hazardFreq: hFreq });
    fractileCurves[2].curve.push({ pga, contribution: p50Val, hazardFreq: hFreq });
    fractileCurves[3].curve.push({ pga, contribution: p95Val, hazardFreq: hFreq });
  }

  const binCount = 30;
  const minVal = trialTotalResults[0];
  const maxVal = trialTotalResults[samples - 1];
  const logMin = Math.log10(Math.max(minVal, 1e-12));
  const logMax = Math.log10(Math.max(maxVal, 1e-4));
  const logStep = (logMax - logMin) / binCount;
  
  const distribution: { value: number, probability: number }[] = [];
  for (let i = 0; i < binCount; i++) {
    const binStart = Math.pow(10, logMin + i * logStep);
    const binEnd = Math.pow(10, logMin + (i + 1) * logStep);
    const count = trialTotalResults.filter(v => v >= binStart && v < binEnd).length;
    distribution.push({ value: binStart, probability: count / samples });
  }

  const meanFractile = hazard.fractiles.find((f: any) => f.percentile === -1) || hazard.fractiles[0];
  const mainResult = quantifyAtHazardFractile(totalRiskBDD, model, settings, meanFractile, selectedETs);

  return {
    ...mainResult,
    topEventProbability: mean,
    topEventProbabilityApprox: mean,
    importanceMeasures: [],
    seismicResult: {
      ...mainResult,
      totalFrequency: mean,
      uncertaintyResult: {
        mean,
        median: medianTotal,
        p05: p05Total,
        p95: p95Total,
        distribution,
        fractileCurves
      }
    },
    computeTimeMs: performance.now() - startTime,
    method: 'seismic_integration'
  };
}

function boxMullerTransform(): number {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
