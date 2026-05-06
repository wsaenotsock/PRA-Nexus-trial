import type { PRAModel, EventTree, Distribution, BasicEvent, InitiatingEvent } from '@/lib/types';
import { calculateProbability, BDDNode } from './bdd';

export interface UncertaintyResult {
  trials: number;
  mean: number;
  p5: number;
  p50: number;
  p95: number;
  distribution: number[]; // Samples for histogram
}

/**
 * Rational approximation of inverse normal CDF (Peter J. Acklam)
 */
function normInv(p: number): number {
  if (p <= 0) return -8; // effectively -infinity for our precision
  if (p >= 1) return 8;

  const a1 = -39.69683028665376;
  const a2 = 220.9460984245205;
  const a3 = -275.9285104469687;
  const a4 = 138.3577518672690;
  const a5 = -30.66479806614716;
  const a6 = 2.506628277459239;

  const b1 = -54.47609879822406;
  const b2 = 161.5858368580409;
  const b3 = -155.6989798598866;
  const b4 = 66.80131188771972;
  const b5 = -13.28068155288572;

  const c1 = -0.007784894002430293;
  const c2 = -0.3223964580411365;
  const c3 = -2.400758277161838;
  const c4 = -2.549732539343734;
  const c5 = 4.374664141464968;
  const c6 = 2.938163982698783;

  const d1 = 0.007784695709041462;
  const d2 = 0.3224671290700398;
  const d3 = 2.445134137142996;
  const d4 = 3.754408661907416;

  const p_low = 0.02425;
  const p_high = 1 - p_low;

  if (0 < p && p < p_low) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
           ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }

  if (p_low <= p && p <= p_high) {
    const q = p - 0.5;
    const r = q * q;
    return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
           (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  }

  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
          ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
}

/**
 * Standard Normal Random Variable (Box-Muller transform)
 */
function randNormal(): number {
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Sample Gamma(shape k, scale theta)
 * Using Marsaglia and Tsang's method
 */
function sampleGamma(k: number, theta: number): number {
  if (k < 1) return sampleGamma(k + 1, theta) * Math.pow(Math.random(), 1 / k);
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  let iterations = 0;
  const maxIterations = 10000;
  
  while (iterations < maxIterations) {
    iterations++;
    let x, v, u;
    do {
      x = randNormal();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v * theta;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * theta;
  }
  return k * theta; // Fallback to mean if failed to converge
}

/**
 * Sample Beta(alpha, beta)
 */
function sampleBeta(alpha: number, beta: number): number {
  const x = sampleGamma(alpha, 1);
  const y = sampleGamma(beta, 1);
  return x / (x + y);
}

/**
 * Sample a value from a given distribution
 */
function sampleDistribution(baseValue: number, dist: Distribution, u?: number): number {
  if (!dist || dist.type === 'point') return baseValue;

  const useInv = u !== undefined;

  switch (dist.type) {
    case 'lognormal': {
      const ef = Math.max(1.0001, dist.errorFactor || 3);
      const sigma = Math.log(ef) / 1.645;
      const mu = Math.log(baseValue);
      const z = useInv ? normInv(u!) : randNormal();
      return Math.exp(mu + sigma * z);
    }
case 'normal': {
  const mu = baseValue;
  const sigma = dist.stdDev !== undefined ? Math.max(1e-20, dist.stdDev) : (Math.abs(mu) * 0.1);
  const z = useInv ? normInv(u!) : randNormal();
  return Math.max(0, mu + sigma * z);
}
case 'uniform': {
  const lower = dist.lower !== undefined ? dist.lower : baseValue * 0.5;
  const upper = dist.upper !== undefined ? dist.upper : baseValue * 1.5;
  const r = useInv ? u! : Math.random();
  const diff = upper - lower;
  return lower + r * (diff === 0 ? 1e-10 : diff);
}
case 'gamma': {
  const k = Math.max(0.01, dist.shape || 1);
  const theta = Math.max(1e-20, dist.scale || (baseValue / k));
  return sampleGamma(k, theta);
}
    case 'beta': {
      // Beta inverse CDF is complex; fallback
      const a = dist.alpha || 1;
      const b = dist.beta || ((a / baseValue) - a);
      return sampleBeta(a, b);
    }
    case 'weibull': {
      const k = dist.shape || 1.5;
      const lambda = dist.scale || (baseValue / Math.pow(-Math.log(0.5), 1 / k));
      const r = useInv ? u! : Math.random();
      return lambda * Math.pow(-Math.log(1 - r), 1 / k);
    }
    default:
      return baseValue;
  }
}

/**
 * Runs a Monte Carlo simulation for a specific BDD node (e.g., a sequence or end state)
 */
export function runMonteCarlo(
  targetBDD: BDDNode,
  model: PRAModel,
  et?: EventTree, // Made optional to support standalone FT
  trials: number = 1000,
  useLHS: boolean = false,
  baseProbabilities?: Record<string, number>
): UncertaintyResult {
  const samples: number[] = [];
  let sum = 0;

  // Prepare participating events
  const basicEvents = model.basicEvents;

  // LHS Generation
  const lhsMatrix: Map<string, number[]> = new Map();
  if (useLHS) {
    const shuffle = (array: number[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    };

    basicEvents.forEach(be => {
      if (be.distribution?.type !== 'point') {
        const strata = new Array(trials);
        for (let i = 0; i < trials; i++) {
          strata[i] = (i + Math.random()) / trials;
        }
        shuffle(strata);
        lhsMatrix.set(be.id, strata);
      }
    });

    model.initiatingEvents.forEach(ieItem => {
      if (ieItem.distribution?.type !== 'point') {
        const strata = new Array(trials);
        for (let i = 0; i < trials; i++) {
          strata[i] = (i + Math.random()) / trials;
        }
        shuffle(strata);
        lhsMatrix.set(ieItem.id, strata);
      }
    });
  }

  for (let i = 0; i < trials; i++) {
    const probabilities = new Map<string, number>();

    // Sample all basic events
    basicEvents.forEach(be => {
      const u = useLHS ? lhsMatrix.get(be.id)?.[i] : undefined;
      const base = (baseProbabilities?.[be.id] ?? be.probability) || 0;
      probabilities.set(be.id, sampleDistribution(base, be.distribution, u));
    });

    // Sample all initiating events
    model.initiatingEvents.forEach(ieItem => {
      const u = useLHS ? lhsMatrix.get(ieItem.id)?.[i] : undefined;
      const base = baseProbabilities?.[ieItem.id] ?? ieItem.frequency;
      const sampledIEFreq = sampleDistribution(base, ieItem.distribution || { type: 'point' }, u);
      probabilities.set(ieItem.id, sampledIEFreq);
    });

    // Fill in other variables from baseProbabilities (MANUAL_ ET branches, CCF expanded events, etc.)
    if (baseProbabilities) {
      Object.entries(baseProbabilities).forEach(([id, val]) => {
        if (!probabilities.has(id)) {
          probabilities.set(id, val);
        }
      });
    }

    // Calculate result for this trial
    const result = calculateProbability(targetBDD, probabilities);
    samples.push(result);
    sum += result;
  }

  // Statistics
  samples.sort((a, b) => a - b);
  const mean = sum / trials;
  const p5 = samples[Math.floor(trials * 0.05)];
  const p50 = samples[Math.floor(trials * 0.50)];
  const p95 = samples[Math.floor(trials * 0.95)];

  return {
    trials,
    mean,
    p5,
    p50,
    p95,
    distribution: samples // In a real app, we might bin these for the histogram
  };
}
