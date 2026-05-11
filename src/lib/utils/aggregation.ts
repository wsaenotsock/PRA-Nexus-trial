import type { QuantificationResult, CutSet, EndStateResult, SequenceResult } from '@/lib/types';

export function aggregateResults(results: QuantificationResult[]): QuantificationResult {
  if (results.length === 0) {
    return {
      topEventProbability: 0,
      topEventProbabilityApprox: 0,
      cutSets: [],
      importanceMeasures: [],
      computeTimeMs: 0,
      method: 'analytical_approx',
    };
  }

  let totalProb = 0;
  let totalTime = 0;
  const allSequences: SequenceResult[] = [];
  const cutsetMap = new Map<string, CutSet>();
  const endStateMap = new Map<string, EndStateResult>();

  results.forEach((res) => {
    totalProb += res.topEventProbability || 0;
    totalTime += res.computeTimeMs || 0;

    // Combine sequence results
    if (res.sequenceResults) {
      allSequences.push(...res.sequenceResults);
    }

    // Combine and merge Cutsets (Frequency addition if exact match, standard for disjoint sequences)
    if (res.cutSets) {
      res.cutSets.forEach((cs) => {
        // Normalize event combination by sorting to detect identical sets
        const key = [...cs.events].sort().join('::');
        const existing = cutsetMap.get(key);
        if (existing) {
          existing.probability += cs.probability;
        } else {
          cutsetMap.set(key, { ...cs });
        }
      });
    }

    // Combine End State Results (Merge by category/name)
    if (res.endStateResults) {
      res.endStateResults.forEach((es) => {
        const key = es.endStateName || es.category || 'Unknown';
        const existing = endStateMap.get(key);
        if (existing) {
          existing.frequency += es.frequency;
        } else {
          endStateMap.set(key, { ...es });
        }
      });
    }
  });

  // Finalize Cutsets: Sort by merged probability descending
  const mergedCutsets = Array.from(cutsetMap.values()).sort((a, b) => b.probability - a.probability);

  // Recalculate End State Contribution ratios
  const finalEndStates = Array.from(endStateMap.values());
  const finalTotalEndStateFreq = finalEndStates.reduce((sum, e) => sum + e.frequency, 0);
  finalEndStates.forEach((e) => {
    e.cdfContribution = finalTotalEndStateFreq > 0 ? (e.frequency / finalTotalEndStateFreq) * 100 : 0;
  });
  finalEndStates.sort((a, b) => b.frequency - a.frequency);

  return {
    topEventProbability: totalProb,
    topEventProbabilityApprox: totalProb, // For consistency
    cutSets: mergedCutsets,
    importanceMeasures: [], // Calculation of cross-tree Importance requires unified BDD, keeping empty for now
    sequenceResults: allSequences,
    endStateResults: finalEndStates,
    computeTimeMs: totalTime,
    method: 'analytical_approx',
  };
}
