import { BDDNode, calculateProbability } from './bdd';
import type { ImportanceMeasure } from '@/lib/types';

export interface SensitivityPoint {
  eventId: string;
  eventName: string;
  baseProb: number;
  lowProb: number;
  highProb: number;
  topProbLow: number;
  topProbBase: number;
  topProbHigh: number;
  swing: number; // |topProbHigh - topProbLow|
}

export interface SensitivityOptions {
  variationType: 'factor' | 'percentile';
  factor?: number; // e.g., 10 for 0.1x to 10x
}

export function calculateSensitivity(
  bddRoot: BDDNode | undefined,
  baseProbabilities: Record<string, number> | undefined,
  targetEvents: ImportanceMeasure[], // Usually top 20 by FV
  options: SensitivityOptions = { variationType: 'factor', factor: 10 }
): SensitivityPoint[] {
  if (!bddRoot || !baseProbabilities) return [];

  const topProbBase = calculateProbability(bddRoot, new Map(Object.entries(baseProbabilities)));
  const results: SensitivityPoint[] = [];

  for (const event of targetEvents) {
    const baseProb = baseProbabilities[event.eventId] ?? 0;
    
    // Skip events with 0 probability or fixed events
    if (baseProb === 0 || baseProb === 1) {
      continue;
    }

    let lowProb = baseProb;
    let highProb = baseProb;

    if (options.variationType === 'factor') {
      const f = options.factor ?? 10;
      lowProb = Math.max(0, baseProb / f);
      highProb = Math.min(1, baseProb * f);
    } else {
      // For percentile, we would need the distribution info. 
      // For simplicity, we fallback to factor if not implemented
      const f = 5;
      lowProb = Math.max(0, baseProb / f);
      highProb = Math.min(1, baseProb * f);
    }

    // Calculate Low
    const lowMap = new Map(Object.entries(baseProbabilities));
    lowMap.set(event.eventId, lowProb);
    const topProbLow = calculateProbability(bddRoot, lowMap);

    // Calculate High
    const highMap = new Map(Object.entries(baseProbabilities));
    highMap.set(event.eventId, highProb);
    const topProbHigh = calculateProbability(bddRoot, highMap);

    results.push({
      eventId: event.eventId,
      eventName: event.eventName,
      baseProb,
      lowProb,
      highProb,
      topProbLow,
      topProbBase,
      topProbHigh,
      swing: Math.abs(topProbHigh - topProbLow)
    });
  }

  // Sort by swing (largest impact first)
  results.sort((a, b) => b.swing - a.swing);

  return results;
}
