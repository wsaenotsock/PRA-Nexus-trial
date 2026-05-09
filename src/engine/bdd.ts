// PRA Nexus — BDD Quantification Engine
// Binary Decision Diagram exact quantification for Fault Trees

import type { Gate, BasicEvent, FaultTree, CutSet, ImportanceMeasure, QuantificationResult, Parameter, CCFGroup } from '@/lib/types';

// ===== BDD Node =====
export interface BDDNode {
  id: number;
  variable: string;      // BasicEvent ID
  high: BDDNode | null;  // if variable = TRUE
  low: BDDNode | null;   // if variable = FALSE
  isTerminal: boolean;
  value?: boolean;        // Only for terminal nodes
}

let nodeCounter = 0;
const nodeCache = new Map<string, BDDNode>();
const variableOrderMap = new Map<string, number>();

export function setVariableOrderMap(order: string[]) {
  variableOrderMap.clear();
  order.forEach((v, index) => {
    variableOrderMap.set(v, index);
  });
}

function compareVariables(v1: string, v2: string): number {
  const o1 = variableOrderMap.get(v1) ?? 999999;
  const o2 = variableOrderMap.get(v2) ?? 999999;
  if (o1 !== o2) return o1 - o2;
  return v1 < v2 ? -1 : (v1 > v2 ? 1 : 0);
}

// Terminal nodes
export const TRUE_NODE: BDDNode = { id: -1, variable: '__TRUE__', high: null, low: null, isTerminal: true, value: true };
export const FALSE_NODE: BDDNode = { id: -2, variable: '__FALSE__', high: null, low: null, isTerminal: true, value: false };

export function resetBDD() {
  nodeCounter = 0;
  nodeCache.clear();
  applyCache.clear();
}

export function makeBDDNode(variable: string, high: BDDNode, low: BDDNode): BDDNode {
  // Reduction: if high == low, skip this node
  if (high === low) return high;

  // Check cache for existing equivalent node
  const key = `${variable}:${high.id}:${low.id}`;
  const cached = nodeCache.get(key);
  if (cached) return cached;

  const node: BDDNode = {
    id: nodeCounter++,
    variable,
    high,
    low,
    isTerminal: false,
  };
  nodeCache.set(key, node);
  return node;
}

// ===== BDD Operations =====
const applyCache = new Map<string, BDDNode>();

export function bddAnd(a: BDDNode, b: BDDNode): BDDNode {
  if (a === FALSE_NODE || b === FALSE_NODE) return FALSE_NODE;
  if (a === TRUE_NODE) return b;
  if (b === TRUE_NODE) return a;
  if (a === b) return a;

  const key = `AND:${a.id}:${b.id}`;
  const cached = applyCache.get(key);
  if (cached) return cached;

  let result: BDDNode;
  const comp = compareVariables(a.variable, b.variable);
  if (comp === 0) {
    result = makeBDDNode(
      a.variable,
      bddAnd(a.high!, b.high!),
      bddAnd(a.low!, b.low!)
    );
  } else if (comp < 0) {
    result = makeBDDNode(
      a.variable,
      bddAnd(a.high!, b),
      bddAnd(a.low!, b)
    );
  } else {
    result = makeBDDNode(
      b.variable,
      bddAnd(a, b.high!),
      bddAnd(a, b.low!)
    );
  }

  applyCache.set(key, result);
  return result;
}

export function bddOr(a: BDDNode, b: BDDNode): BDDNode {
  if (a === TRUE_NODE || b === TRUE_NODE) return TRUE_NODE;
  if (a === FALSE_NODE) return b;
  if (b === FALSE_NODE) return a;
  if (a === b) return a;

  const key = `OR:${a.id}:${b.id}`;
  const cached = applyCache.get(key);
  if (cached) return cached;

  let result: BDDNode;
  const comp = compareVariables(a.variable, b.variable);
  if (comp === 0) {
    result = makeBDDNode(
      a.variable,
      bddOr(a.high!, b.high!),
      bddOr(a.low!, b.low!)
    );
  } else if (comp < 0) {
    result = makeBDDNode(
      a.variable,
      bddOr(a.high!, b),
      bddOr(a.low!, b)
    );
  } else {
    result = makeBDDNode(
      b.variable,
      bddOr(a, b.high!),
      bddOr(a, b.low!)
    );
  }

  applyCache.set(key, result);
  return result;
}

export function bddNot(node: BDDNode): BDDNode {
  if (node === TRUE_NODE) return FALSE_NODE;
  if (node === FALSE_NODE) return TRUE_NODE;
  
  const key = `NOT:${node.id}`;
  const cached = applyCache.get(key);
  if (cached) return cached;
  
  const result = makeBDDNode(
    node.variable,
    bddNot(node.high!),
    bddNot(node.low!)
  );
  applyCache.set(key, result);
  return result;
}

// ===== Build BDD from Fault Tree =====
export function buildBDD(
  gateId: string,
  gates: Gate[],
  basicEvents: BasicEvent[],
  variableOrder: string[],
  allFaultTrees: FaultTree[] = [],
  visitedTrees: Set<string> = new Set()
): BDDNode {
  const gate = gates.find((g) => g.id === gateId);
  
  if (!gate) {
    // Check if it's a basic event
    const be = basicEvents.find((e) => e.id === gateId);
    if (be) {
      if (be.eventType === 'transferGate' && be.linkedFaultTreeId) {
        // Recursive call for transfer gate (as basic event)
        const linkedFT = allFaultTrees.find(f => f.id === be.linkedFaultTreeId);
        if (linkedFT && !visitedTrees.has(linkedFT.id)) {
          const newVisited = new Set(visitedTrees);
          newVisited.add(linkedFT.id);
          return buildBDD(linkedFT.topGateId, linkedFT.gates, basicEvents, variableOrder, allFaultTrees, newVisited);
        }
      }
      return makeBDDNode(be.id, TRUE_NODE, FALSE_NODE);
    }
    return FALSE_NODE;
  }

  // Handle Transfer Gate (as Gate type)
  if (gate.type === 'TRANSFER' && gate.linkedFaultTreeId) {
    const linkedFT = allFaultTrees.find(f => f.id === gate.linkedFaultTreeId);
    if (linkedFT && !visitedTrees.has(linkedFT.id)) {
      const newVisited = new Set(visitedTrees);
      newVisited.add(linkedFT.id);
      return buildBDD(linkedFT.topGateId, linkedFT.gates, basicEvents, variableOrder, allFaultTrees, newVisited);
    }
    return FALSE_NODE;
  }

  // Build BDD for each child
  const childBDDs = gate.children.map((childId) => {
    return buildBDD(childId, gates, basicEvents, variableOrder, allFaultTrees, visitedTrees);
  });

  if (childBDDs.length === 0) return FALSE_NODE;

  // Combine based on gate type
  switch (gate.type) {
    case 'AND': {
      let result = childBDDs[0];
      for (let i = 1; i < childBDDs.length; i++) {
        result = bddAnd(result, childBDDs[i]);
      }
      return result;
    }
    case 'OR': {
      let result = childBDDs[0];
      for (let i = 1; i < childBDDs.length; i++) {
        result = bddOr(result, childBDDs[i]);
      }
      return result;
    }
    case 'ATLEAST':
    case 'VOTE': {
      const k = gate.k ?? 2;
      // K-of-N: OR of all combinations of k elements ANDed
      const combos = combinations(childBDDs, k);
      let result = FALSE_NODE;
      for (const combo of combos) {
        let andResult = combo[0];
        for (let i = 1; i < combo.length; i++) {
          andResult = bddAnd(andResult, combo[i]);
        }
        result = bddOr(result, andResult);
      }
      return result;
    }
    default:
      return FALSE_NODE;
  }
}

// ===== Combinations Helper =====
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map((combo) => [first, ...combo]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

// ===== BDD Probability Calculation (Exact) =====
export function calculateProbability(
  node: BDDNode,
  probabilities: Map<string, number>,
  cache: Map<number, number> = new Map()
): number {
  if (node === TRUE_NODE) return 1;
  if (node === FALSE_NODE) return 0;

  const cached = cache.get(node.id);
  if (cached !== undefined) return cached;

  const p = probabilities.get(node.variable) ?? 0;
  const highProb = calculateProbability(node.high!, probabilities, cache);
  const lowProb = calculateProbability(node.low!, probabilities, cache);

  const result = p * highProb + (1 - p) * lowProb;
  cache.set(node.id, result);
  return result;
}

// ===== Extract MCS from BDD =====
export function extractMCS(
  node: BDDNode, 
  probabilities?: Map<string, number>,
  currentPath: string[] = [], 
  allPaths: string[][] = [],
  currentProb: number = 1.0,
  cutoff: number = 1e-15,
  maxCount: number = 3000
): string[][] {
  if (allPaths.length >= maxCount) return allPaths; // 最大件数に達したら打ち切り

  if (node === TRUE_NODE) {
    allPaths.push([...currentPath]);
    return allPaths;
  }
  if (node === FALSE_NODE) return allPaths;

  // High branch: variable is in the cut set
  const varProb = probabilities?.get(node.variable) ?? 1.0;
  const nextProb = currentProb * varProb;

  // 枝刈り：確率が極小なしきい値を下回るパスは探索を打ち切る
  if (probabilities === undefined || nextProb >= cutoff) {
    currentPath.push(node.variable);
    extractMCS(node.high!, probabilities, currentPath, allPaths, nextProb, cutoff, maxCount);
    currentPath.pop();
  }

  // Low branch: variable is not in the cut set (確率減少なし)
  extractMCS(node.low!, probabilities, currentPath, allPaths, currentProb, cutoff, maxCount);

  return allPaths;
}

// Remove non-minimal cut sets
export function minimizeCutSets(cutSets: string[][]): string[][] {
  const sorted = cutSets.sort((a, b) => a.length - b.length);
  const minimal: string[][] = [];

  for (const cs of sorted) {
    const csSet = new Set(cs);
    const isSubset = minimal.some((m) => {
      const mSet = new Set(m);
      return [...mSet].every((e) => csSet.has(e));
    });
    if (!isSubset) {
      minimal.push(cs);
    }
  }

  return minimal;
}

// ===== Importance Measures =====
export function calculateImportanceMeasures(
  bddRoot: BDDNode,
  basicEvents: BasicEvent[],
  topEventProb: number,
  probabilities: Map<string, number>
): ImportanceMeasure[] {
  const measures: ImportanceMeasure[] = [];

  for (const be of basicEvents) {
    const p = probabilities.get(be.id) ?? 0;
    if (p === 0) continue;

    // Birnbaum: P(Top | BE=1) - P(Top | BE=0)
    const probWith = new Map(probabilities);
    probWith.set(be.id, 1);
    const pTop1 = calculateProbability(bddRoot, probWith);

    const probWithout = new Map(probabilities);
    probWithout.set(be.id, 0);
    const pTop0 = calculateProbability(bddRoot, probWithout);

    const birnbaum = pTop1 - pTop0;

    // Fussell-Vesely: (P(Top) - P(Top | BE=0)) / P(Top)
    const fv = topEventProb > 0 ? (topEventProb - pTop0) / topEventProb : 0;

    // RAW: P(Top | BE=1) / P(Top)
    const raw = topEventProb > 1e-20 ? pTop1 / topEventProb : (pTop1 > 0 ? 999999 : 1);

    // RRW: P(Top) / P(Top | BE=0)
    const rrw = pTop0 > 1e-20 ? topEventProb / pTop0 : (topEventProb > 0 ? 999999 : 1);

    measures.push({
      eventId: be.id,
      eventName: be.name,
      fv,
      raw,
      rrw: isFinite(rrw) ? rrw : 999999,
      birnbaum,
    });
  }

  // Sort by FV descending
  measures.sort((a, b) => b.fv - a.fv);
  return measures;
}

// ===== Rare Event Approximation =====
function rareEventApprox(cutSets: CutSet[]): number {
  let total = 0;
  for (const cs of cutSets) {
    total += cs.probability;
  }
  return Math.min(total, 1);
}

// ===== Variable Ordering (DFS heuristic) =====
export function getVariableOrder(
  topGateId: string, 
  gates: Gate[], 
  basicEvents: BasicEvent[],
  allFaultTrees: FaultTree[] = []
): string[] {
  const order: string[] = [];
  const visited = new Set<string>();

  function dfs(nodeId: string, currentGates: Gate[]) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const gate = currentGates.find((g) => g.id === nodeId);
    if (gate) {
      if (gate.type === 'TRANSFER' && gate.linkedFaultTreeId) {
        const linkedFT = allFaultTrees.find(f => f.id === gate.linkedFaultTreeId);
        if (linkedFT) dfs(linkedFT.topGateId, linkedFT.gates);
      } else {
        for (const child of gate.children) {
          dfs(child, currentGates);
        }
      }
    } else {
      const be = basicEvents.find((e) => e.id === nodeId);
      if (be) {
        if (be.eventType === 'transferGate' && be.linkedFaultTreeId) {
          const linkedFT = allFaultTrees.find(f => f.id === be.linkedFaultTreeId);
          if (linkedFT) dfs(linkedFT.topGateId, linkedFT.gates);
        } else if (!order.includes(be.id)) {
          order.push(be.id);
        }
      }
    }
  }

  dfs(topGateId, gates);
  return order;
}

// ===== BDD Sifting Optimization Heuristics =====
export function siftingOptimize(
  topGateId: string,
  gates: Gate[],
  basicEvents: BasicEvent[],
  initialOrder: string[],
  allFaultTrees: FaultTree[] = []
): { bestOrder: string[]; bestRoot: BDDNode } {
  let bestOrder = [...initialOrder];
  
  // Set initial variable order map and build BDD
  setVariableOrderMap(bestOrder);
  resetBDD();
  let bestRoot = buildBDD(topGateId, gates, basicEvents, bestOrder, allFaultTrees);
  let minNodeCount = nodeCounter;

  // Skip optimization for very small or very large trees to save computation time/memory
  if (minNodeCount < 30 || bestOrder.length <= 1 || bestOrder.length > 30) {
    return { bestOrder, bestRoot };
  }

  // Optimize up to top 15 variables (highest likelihood of bottleneck)
  const siftingCandidates = [...bestOrder].slice(0, Math.min(bestOrder.length, 15));

  for (const varToSift of siftingCandidates) {
    const originalPos = bestOrder.indexOf(varToSift);
    let bestPos = originalPos;

    // Test distinct representative positions in the ordering
    const testPositions = Array.from(new Set([
      0,
      Math.floor(bestOrder.length * 0.25),
      Math.floor(bestOrder.length * 0.5),
      Math.floor(bestOrder.length * 0.75),
      bestOrder.length - 1,
      Math.max(0, originalPos - 1),
      Math.min(bestOrder.length - 1, originalPos + 1)
    ])).filter(pos => pos >= 0 && pos < bestOrder.length);

    for (const pos of testPositions) {
      if (pos === originalPos) continue;

      // Create temporary variable order
      const tempOrder = bestOrder.filter(v => v !== varToSift);
      tempOrder.splice(pos, 0, varToSift);

      // Rebuild and evaluate node count
      setVariableOrderMap(tempOrder);
      resetBDD();
      const tempRoot = buildBDD(topGateId, gates, basicEvents, tempOrder, allFaultTrees);
      const tempNodeCount = nodeCounter;

      if (tempNodeCount < minNodeCount && tempNodeCount > 0) {
        minNodeCount = tempNodeCount;
        bestOrder = tempOrder;
        bestRoot = tempRoot;
        bestPos = pos;
      }
    }
  }

  // Restore the best state
  setVariableOrderMap(bestOrder);
  resetBDD();
  bestRoot = buildBDD(topGateId, gates, basicEvents, bestOrder, allFaultTrees);

  return { bestOrder, bestRoot };
}

// ===== Analytical Probability Helper for Fallback =====
export function calculateAnalyticalProbability(
  gateId: string,
  gates: Gate[],
  probabilities: Map<string, number>,
  allFaultTrees: FaultTree[] = [],
  visited: Set<string> = new Set()
): number {
  if (visited.has(gateId)) return 0; // 現在の垂直探索パス（スタック）内の循環参照を検出し無限ループを防止
  visited.add(gateId);

  const gate = gates.find(g => g.id === gateId);
  if (!gate) {
    // 基本事象の場合は、他の別パスからの重複参照を許容するためバックトラックしてから確率を返却
    visited.delete(gateId);
    return probabilities.get(gateId) ?? 0;
  }

  if (gate.type === 'TRANSFER' && gate.linkedFaultTreeId) {
    const linkedFT = allFaultTrees.find(f => f.id === gate.linkedFaultTreeId);
    if (linkedFT) {
      const prob = calculateAnalyticalProbability(linkedFT.topGateId, linkedFT.gates, probabilities, allFaultTrees, visited);
      visited.delete(gateId);
      return prob;
    }
    visited.delete(gateId);
    return 0;
  }

  const childProbs = gate.children.map(childId => {
    return calculateAnalyticalProbability(childId, gates, probabilities, allFaultTrees, visited);
  });

  // このゲートの探索を抜けるため、visitedから削除（バックトラック）
  visited.delete(gateId);

  if (childProbs.length === 0) return 0;

  switch (gate.type) {
    case 'AND': {
      return childProbs.reduce((acc, p) => acc * p, 1);
    }
    case 'OR': {
      // 1 - prod(1 - p_i) for exact independent OR
      return 1 - childProbs.reduce((acc, p) => acc * (1 - p), 1);
    }
    case 'ATLEAST':
    case 'VOTE': {
      const k = gate.k ?? 2;
      return childProbs.sort((a, b) => b - a).slice(0, k).reduce((acc, p) => acc * p, 1);
    }
    default:
      return 0;
  }
}

// ===== Main Quantification Function =====
export function quantifyFaultTree(
  originalFaultTree: FaultTree,
  originalBasicEvents: BasicEvent[],
  parameters: Parameter[] = [],
  ccfGroups: CCFGroup[] = [],
  allFaultTrees: FaultTree[] = [],
  cutoff: number = 1e-15,
  maxCutsets: number = 3000
): QuantificationResult {
  const startTime = performance.now();

  // Reset BDD caches
  resetBDD();
  applyCache.clear();

  // Optimized cloning: shallow copy for root structures, deep for gates list if needed
  const faultTree = { ...originalFaultTree };
  const basicEvents = [...originalBasicEvents];

  // 1. Build initial probability map (with Parameter resolution)
  const probabilities = new Map<string, number>();
  for (const be of basicEvents) {
    let p = be.probability;
    if (be.parameterId) {
      const param = parameters.find((p) => p.id === be.parameterId);
      if (param) {
        p = param.failureType === 'demand'
          ? param.value * (be.demands ?? 1)
          : param.value * (be.missionTime ?? 24);
      }
    }
    if (p === undefined) {
      p = be.failureType === 'demand' 
        ? be.failureRate * (be.demands ?? 1)
        : be.failureRate * (be.missionTime ?? 24);
    }
    probabilities.set(be.id, Math.min(p, 1));
  }

  // 2. Expand CCF Groups
  for (const group of ccfGroups) {
    const members = group.members.filter(id => basicEvents.some(be => be.id === id));
    const m = members.length;
    if (m < 2) continue;

    // Calculate Q_t (average of member probabilities)
    let sumQ = 0;
    for (const memberId of members) sumQ += (probabilities.get(memberId) ?? 0);
    const Qt = sumQ / m;

    // Calculate probabilities of specific combinations of size k failing
    const probs = new Array(m + 1).fill(0);
    if (group.model === 'beta_factor') {
      const beta = group.parameters.beta ?? 0.1;
      probs[1] = (1 - beta) * Qt;
      probs[m] = beta * Qt;
    } else if (group.model === 'mgl') {
      const beta = group.parameters.beta ?? 0.1;
      const gamma = group.parameters.gamma ?? 0.0;
      const delta = group.parameters.delta ?? 0.0;
      if (m === 2) {
        probs[1] = (1 - beta) * Qt;
        probs[2] = beta * Qt;
      } else if (m === 3) {
        probs[1] = (1 - beta) * Qt;
        probs[2] = 0.5 * beta * (1 - gamma) * Qt;
        probs[3] = beta * gamma * Qt;
      } else {
        probs[1] = (1 - beta) * Qt;
        probs[m] = beta * Qt; // Fallback
      }
    } else if (group.model === 'alpha_factor') {
      const alphas = [0, group.parameters.alpha1 ?? 1, group.parameters.alpha2 ?? 0, group.parameters.alpha3 ?? 0, group.parameters.alpha4 ?? 0];
      let alpha_t = 0;
      for (let k = 1; k <= m; k++) alpha_t += k * (alphas[k] || 0);
      if (alpha_t === 0) alpha_t = 1;

      for (let k = 1; k <= m; k++) {
        let combinations = 1;
        if (m === 2 && k === 2) combinations = 1;
        if (m === 3 && k === 2) combinations = 2;
        if (m === 3 && k === 3) combinations = 1;
        if (m === 4 && k === 2) combinations = 3;
        if (m === 4 && k === 3) combinations = 3;
        probs[k] = (k / combinations) * ((alphas[k] || 0) / alpha_t) * Qt;
      }
    }

    // Create virtual CCF basic events
    const ccfEventIds: string[][] = Array.from({ length: m + 1 }, () => []);
    
    // Independent events (k=1)
    for (const memberId of members) {
      const indId = `CCF_${group.id}_IND_${memberId}`;
      ccfEventIds[1].push(indId);
      probabilities.set(indId, Math.min(probs[1], 1));
      basicEvents.push({ id: indId, name: `${basicEvents.find(be => be.id === memberId)?.name} (Ind)`, tags: [], failureRate: 0, distribution: { type: 'point' }, source: '', memo: '' });
    }

    // CCF combinations (k >= 2)
    const getCombinations = (arr: string[], k: number): string[][] => {
      if (k === 1) return arr.map(e => [e]);
      if (k === arr.length) return [arr];
      if (k > arr.length || k <= 0) return [];
      const head = arr[0];
      const tail = arr.slice(1);
      const withHead = getCombinations(tail, k - 1).map(c => [head, ...c]);
      const withoutHead = getCombinations(tail, k);
      return [...withHead, ...withoutHead];
    };

    for (let k = 2; k <= m; k++) {
      if (probs[k] <= 0) continue;
      const combs = getCombinations(members, k);
      for (const comb of combs) {
        const ccfId = `CCF_${group.id}_${comb.join('_')}`;
        ccfEventIds[k].push(ccfId);
        probabilities.set(ccfId, Math.min(probs[k], 1));
        const combNames = comb.map(id => basicEvents.find(be => be.id === id)?.name).join('-');
        basicEvents.push({ id: ccfId, name: `CCF (${combNames})`, tags: [], failureRate: 0, distribution: { type: 'point' }, source: '', memo: '' });
      }
    }

    // Replace original basic events in Fault Tree with an OR gate of their CCF combinations
    for (const memberId of members) {
      const virtualGateId = `VG_${group.id}_${memberId}`;
      const virtualChildren = [];
      
      // Add independent part
      const indIdx = members.indexOf(memberId);
      virtualChildren.push(ccfEventIds[1][indIdx]);
      
      // Add CCF parts that include this member
      for (let k = 2; k <= m; k++) {
        if (probs[k] <= 0) continue;
        const combs = getCombinations(members, k);
        combs.forEach((comb, idx) => {
          if (comb.includes(memberId)) {
            virtualChildren.push(ccfEventIds[k][idx]);
          }
        });
      }

      // Add the virtual OR gate
      faultTree.gates.push({
        id: virtualGateId,
        name: `Virtual CCF OR for ${memberId}`,
        type: 'OR',
        children: virtualChildren,
        position: { x: 0, y: 0 }
      });

      // Replace memberId with virtualGateId in all parent gates
      for (const gate of faultTree.gates) {
        if (gate.id !== virtualGateId) {
          const childIdx = gate.children.indexOf(memberId);
          if (childIdx !== -1) {
            gate.children[childIdx] = virtualGateId;
          }
        }
      }
    }
  }

  // Get variable ordering
  const variableOrder = getVariableOrder(faultTree.topGateId, faultTree.gates, basicEvents, allFaultTrees);

  // 500変数超の巨大フォルトツリーであっても、厳密なROBDD（Binary Decision Diagram）を構築し、
  // 数学的に重複事象や共通原因を完全に処理した厳密なBDD定量化結果を返却します。

  // Build optimized BDD using Sifting (incorporating DFS and Sifting)
  const { bestRoot: bddRoot } = siftingOptimize(
    faultTree.topGateId,
    faultTree.gates,
    basicEvents,
    variableOrder,
    allFaultTrees
  );

  // Calculate exact probability
  const topEventProbability = calculateProbability(bddRoot, probabilities);

  // Extract MCS
  const rawCutSets = extractMCS(bddRoot, probabilities, [], [], 1.0, cutoff, maxCutsets);
  const minimalCutSets = minimizeCutSets(rawCutSets);

  // Create CutSet objects with probabilities
  const cutSets: CutSet[] = minimalCutSets.map((cs) => {
    let prob = 1;
    for (const eventId of cs) {
      prob *= probabilities.get(eventId) ?? 0;
    }
    return {
      events: cs,
      probability: prob,
      order: cs.length,
    };
  }).sort((a, b) => b.probability - a.probability);

  // Rare event approximation for comparison
  const topEventProbabilityApprox = rareEventApprox(cutSets);

  // Calculate importance measures
  const importanceMeasures = calculateImportanceMeasures(
    bddRoot,
    basicEvents,
    topEventProbability,
    probabilities
  );

  const computeTimeMs = performance.now() - startTime;

  return {
    topEventProbability,
    topEventProbabilityApprox,
    cutSets,
    importanceMeasures,
    totalRiskBDD: bddRoot, // Added for Monte Carlo
    computeTimeMs,
    method: 'bdd_exact',
    baseProbabilities: Object.fromEntries(probabilities),
  };
}
