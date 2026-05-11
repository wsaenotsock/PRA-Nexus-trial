import { quantifyFaultTree } from '@/engine/bdd';
import { quantifyEventTree } from '@/engine/et_quant';
import { quantifySeismic } from '@/engine/seismic_quant';
import { runMonteCarlo } from '@/engine/monte_carlo';
import { calculateSensitivity } from '@/engine/sensitivity';
import { PRAModel, QuantificationResult, ImportanceMeasure } from '@/lib/types';
import { BDDNode, bddOr, FALSE_NODE } from '@/engine/bdd';

let currentModel: PRAModel | null = null;
let currentResult: QuantificationResult | null = null;

self.onmessage = async (e: MessageEvent) => {
  try {
    const { type, payload, id } = e.data;
    console.log(`[QuantWorker] Received command: ${type}`, { id, targetId: payload?.targetId });

    switch (type) {
      case 'QUANTIFY_FT': {
        const { model, targetId } = payload;
        if (!model) throw new Error('Model is missing in payload');
        currentModel = model;
        const ft = (model.faultTrees || []).find((f: any) => f.id === targetId);
        if (!ft) throw new Error(`Fault Tree not found: ${targetId}`);
        
        const cutoffValue = model.quantificationSettings?.cutOff ?? 1e-15;
        const maxCutsetsValue = model.quantificationSettings?.maxCutsets ?? 3000;
        const res = quantifyFaultTree(
          ft,
          model.basicEvents || [],
          model.parameters || [],
          model.ccfGroups || [],
          model.faultTrees || [],
          cutoffValue,
          maxCutsetsValue
        );
        res.cutoff = cutoffValue;
        currentResult = res;
        self.postMessage({ id, type: 'SUCCESS', result: cleanResult(res) });
        break;
      }
      case 'QUANTIFY_ET': {
        const { model, targetId } = payload;
        if (!model) throw new Error('Model is missing in payload');
        currentModel = model;
        const et = (model.eventTrees || []).find((e: any) => e.id === targetId);
        if (!et) throw new Error(`Event Tree not found: ${targetId}`);
        
        const res = quantifyEventTree(et, model);
        res.cutoff = model.quantificationSettings?.cutOff;
        currentResult = res;
        self.postMessage({ id, type: 'SUCCESS', result: cleanResult(res) });
        break;
      }
      case 'QUANTIFY_SEISMIC': {
        const { model } = payload;
        currentModel = model;
        const res = quantifySeismic('', model);
        currentResult = res;
        self.postMessage({ id, type: 'SUCCESS', result: cleanResult(res) });
        break;
      }
      case 'RUN_MONTE_CARLO': {
        const { targetType, targetId, trials, useLHS } = payload;
        if (!currentResult || !currentModel) throw new Error('No active quantification result found. Run quantification first.');

        let targetBDD: BDDNode = FALSE_NODE;

        if (targetType === 'total') {
          targetBDD = currentResult.totalRiskBDD;
        } else if (targetType === 'category' && targetId) {
          // Find all sequences that map to this end state category
          // et object logic here...
          // For simplicity, we just rebuild it if we can, or rely on the UI to send the ET?
          // The ET is in currentModel
          const seqsToOr = currentResult.sequenceResults?.filter((sr: any) => {
            const ets = currentModel!.eventTrees;
            for (const et of ets) {
              const seq = et.sequences.find(s => s.id === sr.sequenceId);
              if (seq) {
                const es = currentModel!.endStates.find(e => e.id === seq.endStateId);
                return es?.categories?.includes(targetId);
              }
            }
            return false;
          }).map((sr: any) => sr.sequenceId) || [];

          for (const seqId of seqsToOr) {
            const bdd = currentResult.sequenceBDDs?.[seqId];
            if (bdd) targetBDD = bddOr(targetBDD, bdd);
          }
        } else if (targetType === 'endstate' && targetId) {
          const seqsToOr = currentResult.sequenceResults?.filter((sr: any) => {
            const ets = currentModel!.eventTrees;
            for (const et of ets) {
              const seq = et.sequences.find(s => s.id === sr.sequenceId);
              if (seq && seq.endStateId === targetId) return true;
            }
            return false;
          }).map((sr: any) => sr.sequenceId) || [];

          for (const seqId of seqsToOr) {
            const bdd = currentResult.sequenceBDDs?.[seqId];
            if (bdd) targetBDD = bddOr(targetBDD, bdd);
          }
        }

        if (targetBDD === FALSE_NODE && targetType !== 'total') {
           self.postMessage({ id, type: 'SUCCESS', result: null });
           break;
        }

        // We run Monte Carlo using the selected mode (LHS implemented in monte_carlo.ts)
        const mcRes = runMonteCarlo(targetBDD, currentModel, undefined, trials, useLHS, currentResult.baseProbabilities);
        self.postMessage({ id, type: 'SUCCESS', result: mcRes });
        break;
      }
      case 'RUN_SENSITIVITY': {
        const { targetEvents, options } = payload;
        if (!currentResult || !currentResult.totalRiskBDD || !currentResult.baseProbabilities) {
           throw new Error('No BDD or base probabilities available.');
        }
        const sRes = calculateSensitivity(currentResult.totalRiskBDD, currentResult.baseProbabilities, targetEvents, options);
        self.postMessage({ id, type: 'SUCCESS', result: sRes });
        break;
      }
      default:
        throw new Error(`Unknown worker command: ${type}`);
    }
  } catch (error: any) {
    self.postMessage({ id: e.data.id, type: 'ERROR', error: error.message });
  }
};

// Removes circular or highly nested objects before sending back to main thread
function cleanResult(res: QuantificationResult): any {
  const cleaned = { ...res };
  delete cleaned.totalRiskBDD;
  delete cleaned.sequenceBDDs;
  return cleaned;
}
