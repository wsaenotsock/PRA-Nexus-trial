import { EventTree, PRAModel } from '@/lib/types';
import { quantifyFaultTree } from './bdd';

export interface SequenceResult {
  sequenceId: string;
  endStateId: string;
  frequency: number;
  pathProbabilities: { functionalEventId: string; branchId: string; probability: number }[];
}

export interface ETQuantificationResult {
  eventTreeId: string;
  calculationTimeMs: number;
  sequences: SequenceResult[];
  totalFrequency: number;
}

export function quantifyEventTree(eventTreeId: string, model: PRAModel): ETQuantificationResult {
  const startTime = performance.now();
  
  const et = model.eventTrees?.find(e => e.id === eventTreeId);
  if (!et) throw new Error('Event Tree not found');

  const ie = model.initiatingEvents?.find(i => i.id === et.initiatingEventId);
  const ieFreq = ie?.frequency ?? 0;

  // Cache FT probabilities to avoid re-calculating the same FT multiple times
  const ftProbCache = new Map<string, number>();

  const getBranchProbability = (feId: string, branchId: string): number => {
    const fe = et.functionalEvents.find(f => f.id === feId);
    if (!fe || !fe.linkedFaultTreeId) {
      // Default to 0.5 if no FT is linked
      return 0.5;
    }

    let prob = ftProbCache.get(fe.linkedFaultTreeId);
    if (prob === undefined) {
      try {
        const ft = model.faultTrees?.find(t => t.id === fe.linkedFaultTreeId);
        if (ft) {
          const result = quantifyFaultTree(ft, model.basicEvents, model.parameters, model.ccfGroups);
          prob = result.topEventProbability;
        } else {
          prob = 0.5;
        }
      } catch (e) {
        console.warn(`Failed to quantify linked FT ${fe.linkedFaultTreeId}`, e);
        prob = 0.5; // fallback
      }
      ftProbCache.set(fe.linkedFaultTreeId, prob);
    }

    // Assumption: 'failure' branch is the FT probability. 'success' branch is 1 - FT probability.
    if (branchId === 'failure') {
      return prob;
    } else {
      return 1.0 - prob;
    }
  };

  const sequences: SequenceResult[] = et.sequences.map(seq => {
    let seqFreq = ieFreq;
    const pathProbs: { functionalEventId: string; branchId: string; probability: number }[] = [];

    for (const step of seq.path) {
      const p = getBranchProbability(step.functionalEventId, step.branchId);
      seqFreq *= p;
      pathProbs.push({
        functionalEventId: step.functionalEventId,
        branchId: step.branchId,
        probability: p
      });
    }

    return {
      sequenceId: seq.id,
      endStateId: seq.endStateId,
      frequency: seqFreq,
      pathProbabilities: pathProbs,
    };
  });

  const totalFrequency = sequences.reduce((sum, seq) => sum + seq.frequency, 0);

  return {
    eventTreeId,
    calculationTimeMs: performance.now() - startTime,
    sequences,
    totalFrequency,
  };
}
