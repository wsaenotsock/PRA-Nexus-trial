import fs from 'fs';
import path from 'path';

// 保存先ディレクトリとファイル名の設定
const OUTPUT_DIR = 'C:\\Users\\User\\Downloads';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'large_scale_test_model.json');

console.log('--- 疑似巨大検証モデルの生成を開始します (子ノード数制限版) ---');

// 1. エンドステートの定義
const endStates = [
  { id: 'es_ok', name: 'OK', categories: ['success'], color: '#00D68F', description: '正常' },
  { id: 'es_cdf_1', name: 'CDF_1 (Core Damage)', categories: ['core_damage'], color: '#FF4757', description: '炉心損傷カテゴリー1' },
  { id: 'es_cdf_2', name: 'CDF_2 (Severe)', categories: ['core_damage'], color: '#FF4757', description: '炉心損傷カテゴリー2' },
  { id: 'es_cdf_3', name: 'CDF_3 (Early Release)', categories: ['core_damage'], color: '#FF9F43', description: '早期放出' },
  { id: 'es_cdf_4', name: 'CDF_4 (Late Release)', categories: ['core_damage'], color: '#FF9F43', description: '後期放出' },
  { id: 'es_cdf_5', name: 'CDF_5 (Vulnerable)', categories: ['core_damage'], color: '#FF4757', description: '脆弱状態' }
];

// 2. 基事象 (12,000個、一意、対数正規分布、確率 1.0e-5 〜 1.0e-2) の生成
console.log('1. 基事象を12,000個生成中...');
const basicEvents = [];
for (let i = 1; i <= 12000; i++) {
  // 对数スケールで 1.0e-5 ~ 1.0e-2 の範囲でランダム
  const logMin = Math.log(1e-5);
  const logMax = Math.log(1e-2);
  const prob = Math.exp(logMin + Math.random() * (logMax - logMin));
  
  const id = `be_id_${String(i).padStart(5, '0')}`;
  basicEvents.push({
    id: id,
    name: `BE_${String(i).padStart(5, '0')}`,
    eventType: 'basicEvent',
    tags: ['疑似モデル', `TAG_${i % 10}`],
    failureType: 'time',
    failureRate: prob,
    probability: prob,
    missionTime: 24,
    demands: 1,
    distribution: {
      type: 'lognormal',
      mean: prob,
      errorFactor: 3
    },
    source: 'Generated_SpeedTest',
    memo: `計算速度検証用基事象 ${i}`,
    position: { x: 0, y: 0 }
  });
}

// 3. FT (30個、各500個の「非重複」基事象、10〜20階層、完全一親制、1ゲートあたり最大10子ノード) の生成
console.log('2. フォルトツリー (30個、各500個の一親制基事象、1ゲート最大10子ノード) を生成中...');
const faultTrees = [];
const ftIds = [];

// 基本事象を再帰的に最大9個ずつのピラミッド状に配分し、子ノード数が確実に10以下になるようサブゲートを作成するヘルパー関数
function buildSubTree(parentId, beIds, gates, ftId, level = 0) {
  const maxChildren = 9; // 子ノード数の上限（マージンを考慮して9以下に設定。背骨チェーン用スロットを含むため）
  
  if (beIds.length <= maxChildren) {
    // 9個以下なら、直接親ゲートの子供にすべて追加して再帰終了
    const parentGate = gates.find(g => g.id === parentId);
    if (parentGate) {
      parentGate.children.push(...beIds);
    }
    return;
  }
  
  // 9個を超える場合、maxChildren個ずつのチャンクに分割
  const chunks = [];
  for (let i = 0; i < beIds.length; i += maxChildren) {
    chunks.push(beIds.slice(i, i + maxChildren));
  }
  
  const parentGate = gates.find(g => g.id === parentId);
  if (!parentGate) return;
  
  chunks.forEach((chunk, cIdx) => {
    // ゲートIDが長くなりすぎないように、シンプルな一意の名前を生成
    const subGateId = `g_${ftId}_s${parentId.split('_').pop()}_l${level}_c${cIdx}`;
    const subGateType = Math.random() > 0.5 ? 'AND' : 'OR';
    
    // サブゲートの作成
    const subGate = {
      id: subGateId,
      name: `G_${ftId.toUpperCase()}_S_${parentId.split('_').pop().toUpperCase()}_L${level}_C${cIdx}`,
      type: subGateType,
      children: [],
      position: { 
        x: parentGate.position.x + (cIdx - (chunks.length - 1) / 2) * 120, 
        y: parentGate.position.y + 120 
      }
    };
    
    gates.push(subGate);
    parentGate.children.push(subGateId);
    
    // 再帰的にこのサブゲートの下に基本事象を配分
    buildSubTree(subGateId, chunk, gates, ftId, level + 1);
  });
}

// Bottom-Up & Center-Aligned 階層型オートレイアウトアルゴリズム
// 重なりを 100% 排除し、美しい左右対称の Top-Down ツリー構造を自動計算します。
function autoLayoutFT(gates, topGateId) {
  const nodeLevels = {}; // nodeId -> level
  
  // DFSで各ノードの「深さ (level)」を特定 (Y座標の決定に利用)
  function dfsDepth(nodeId, depth) {
    nodeLevels[nodeId] = depth;
    const g = gates.find(x => x.id === nodeId);
    if (g) {
      g.children.forEach(c => {
        if (c.startsWith('g_')) {
          dfsDepth(c, depth + 1);
        }
      });
    }
  }
  dfsDepth(topGateId, 0);

  let leafCount = 0;
  const xCoords = {};

  // Bottom-Up で X 座標を割り当て
  // 葉ゲート（子供を持たないゲート）を等間隔に並べ、親ゲートはその子供たちのちょうど平均値（中心）に揃えます。
  function dfsAssignX(nodeId) {
    const g = gates.find(x => x.id === nodeId);
    if (!g) return;

    const childGateIds = g.children.filter(c => c.startsWith('g_'));
    
    if (childGateIds.length === 0) {
      // 葉ノード（ゲートとしての末端）は 180px 間隔で等間隔に配置
      xCoords[nodeId] = leafCount * 180;
      leafCount++;
    } else {
      // 子ゲートが有る場合、まず子供たちの X を再帰的に決定
      childGateIds.forEach(dfsAssignX);
      
      // 親の X は子供たちの X 座標の中心値（平均）に揃える
      let sumX = 0;
      childGateIds.forEach(cId => {
        sumX += xCoords[cId];
      });
      xCoords[nodeId] = sumX / childGateIds.length;
    }
  }
  dfsAssignX(topGateId);

  // すべてのゲートの coordinates を適用
  gates.forEach(g => {
    const depth = nodeLevels[g.id] ?? 0;
    g.position = {
      x: Math.round(xCoords[g.id] ?? 400),
      y: depth * 160 + 100
    };
  });
}

for (let f = 1; f <= 30; f++) {
  const ftId = `ft_id_${String(f).padStart(2, '0')}`;
  ftIds.push(ftId);
  const ftName = `FT_${String(f).padStart(2, '0')}`;
  
  // このFTに割り当てる500個の基事象を非重複でサンプリング
  const assignedBeIds = [];
  const chosenIndices = new Set();
  while (assignedBeIds.length < 500) {
    const rIndex = Math.floor(Math.random() * 12000);
    if (!chosenIndices.has(rIndex)) {
      chosenIndices.add(rIndex);
      assignedBeIds.push(basicEvents[rIndex].id);
    }
  }
  
  // 背骨ゲートの深さを 8~12 に設定
  // ピラミッド型サブツリーの加算階層（最大2層）を考慮し、全体の最大深さが確実に 10〜15層 に収まるように調整
  const spineDepth = 9 + Math.floor(Math.random() * 5); // 9 ~ 13
  
  const gates = [];
  // 背骨ゲートチェーンの構築
  for (let d = 0; d < spineDepth; d++) {
    const gateId = `g_${ftId}_spine_${d}`;
    const gateType = Math.random() > 0.5 ? 'AND' : 'OR';
    
    const children = [];
    if (d < spineDepth - 1) {
      children.push(`g_${ftId}_spine_${d + 1}`);
    }
    
    gates.push({
      id: gateId,
      name: `G_${ftName}_SPINE_${d}`,
      type: gateType,
      children: children,
      position: { x: 400, y: d * 150 }
    });
  }
  
  // 500個の基事象を背骨ゲートに均等に配分
  const bePerSpine = Math.ceil(assignedBeIds.length / spineDepth);
  for (let d = 0; d < spineDepth; d++) {
    const spineGateId = `g_${ftId}_spine_${d}`;
    const beStart = d * bePerSpine;
    const beEnd = Math.min((d + 1) * bePerSpine, assignedBeIds.length);
    const slice = assignedBeIds.slice(beStart, beEnd);
    
    if (slice.length > 0) {
      // 各背骨ゲートの下に、最大10子ノードの制限を満たす再帰ピラミッドツリーを展開
      buildSubTree(spineGateId, slice, gates, ftId, 0);
    }
  }
  
  // 各フォルトツリーをBottom-Up中心揃え階層型オートレイアウト（重なりを100%防止）
  autoLayoutFT(gates, `g_${ftId}_spine_0`);
  
  faultTrees.push({
    id: ftId,
    name: ftName,
    topGateId: `g_${ftId}_spine_0`,
    gates: gates
  });
}

// 4. CCFグループ (60個、βファクタモデル、2〜6個メンバー、一意基事象200個対象) の生成
console.log('3. CCFグループ (60個、一意基事象200個対象、2〜6個メンバー) を生成中...');
const ccfTargetBeIds = [];
while (ccfTargetBeIds.length < 200) {
  const rIndex = Math.floor(Math.random() * 12000);
  const beId = basicEvents[rIndex].id;
  if (!ccfTargetBeIds.includes(beId)) {
    ccfTargetBeIds.push(beId);
  }
}

const ccfGroups = [];
for (let c = 1; c <= 60; c++) {
  const memberCount = 2 + Math.floor(Math.random() * 5); // 2 ~ 6個
  const members = [];
  
  // 200個の対象基事象から重複しないようにメンバーを選択
  const tempTargets = [...ccfTargetBeIds];
  for (let m = 0; m < memberCount; m++) {
    if (tempTargets.length === 0) break;
    const rIdx = Math.floor(Math.random() * tempTargets.length);
    members.push(tempTargets.splice(rIdx, 1)[0]);
  }
  
  const beta = 0.05 + Math.random() * 0.1; // β値：0.05 〜 0.15
  ccfGroups.push({
    id: `ccf_id_${String(c).padStart(2, '0')}`,
    name: `CCF_Group_${String(c).padStart(2, '0')}`,
    model: 'beta_factor',
    members: members,
    parameters: {
      beta: parseFloat(beta.toFixed(4))
    }
  });
}

// 5. ETおよび起因事象 (20個、各10ヘディング、各完全に排他的な30分岐、周波数ランダム) の生成
console.log('4. イベントツリー (20個、完全二分木・排他的30分岐、DFSソート済) を生成中...');
const initiatingEvents = [];
const eventTrees = [];

for (let e = 1; e <= 20; e++) {
  const ieId = `ie_id_${String(e).padStart(2, '0')}`;
  const ieCode = `IE_${String(e).padStart(2, '0')}`;
  const freq = 0.1 + Math.random() * 1.4; // 0.1 〜 1.5 /年
  
  initiatingEvents.push({
    id: ieId,
    code: ieCode,
    name: `Initiating Event ${ieCode}`,
    frequency: parseFloat(freq.toFixed(4)),
    description: `疑似起因事象 ${ieCode}`
  });
  
  // 10個のヘディング
  const functionalEvents = [];
  for (let h = 1; h <= 10; h++) {
    const rFtId = ftIds[Math.floor(Math.random() * 30)]; // 30FTからランダム紐付け
    functionalEvents.push({
      id: `fe_id_${String(e).padStart(2, '0')}_${h}`,
      code: `H${h}`,
      name: `Heading ${h} (ET ${e})`,
      linkedFaultTreeId: rFtId,
      branches: [
        { id: 'success', label: 'Success' },
        { id: 'failure', label: 'Failure' }
      ]
    });
  }
  
  // --- トポロジカルDFS順二分木構築アルゴリズム ---
  // すべてのヘディング（1〜10）で少なくとも1回は分岐が発生することを保証し、
  // かつ描画キャンバスで線が交差しない（変なところで交わらない）ようにシーケンスをDFS順（トポロジカル順）でソートして出力します。
  
  // ツリーノードの定義。各ノードは一意のパス（BranchDecision[]）を表します
  let rootNode = {
    path: [],
    children: null // { success: node, failure: node }
  };
  
  // まず、最深10層に達する「メイン背骨」を1つ作ります。
  // これにより、すべてのヘディング（1〜10）に確実に少なくとも1つの分岐が作成されます。
  let currentNode = rootNode;
  for (let h = 0; h < 10; h++) {
    const feId = functionalEvents[h].id;
    currentNode.children = {
      success: { path: [...currentNode.path, { functionalEventId: feId, branchId: 'success' }], children: null },
      failure: { path: [...currentNode.path, { functionalEventId: feId, branchId: 'failure' }], children: null }
    };
    // 次に進むノード（背骨の続き）をSuccess側に固定して進めます
    currentNode = currentNode.children.success;
  }
  
  // 現在、ツリーに含まれる「葉ノード（確定シーケンス候補）」の数は 11 個です。
  // 目標の 30 個 に達するまで、深さ10未満の葉ノードを選んで、次のヘディングで2分岐させます。
  function getLeaves(node) {
    if (!node.children) {
      return [node];
    }
    return [...getLeaves(node.children.success), ...getLeaves(node.children.failure)];
  }
  
  while (true) {
    let leaves = getLeaves(rootNode);
    if (leaves.length >= 30) {
      break;
    }
    
    // まだ 10層未満（分岐可能）の葉ノードを探索
    let splittableLeaves = leaves.filter(leaf => leaf.path.length < 10);
    if (splittableLeaves.length === 0) {
      break; // これ以上分岐できない
    }
    
    // 最も浅い（長さの短い）葉ノードを選択して2分岐させる（マージが自然になるように幅優先的な拡張）
    splittableLeaves.sort((a, b) => a.path.length - b.path.length);
    let leafToSplit = splittableLeaves[0];
    
    const hIdx = leafToSplit.path.length;
    const feId = functionalEvents[hIdx].id;
    
    leafToSplit.children = {
      success: { path: [...leafToSplit.path, { functionalEventId: feId, branchId: 'success' }], children: null },
      failure: { path: [...leafToSplit.path, { functionalEventId: feId, branchId: 'failure' }], children: null }
    };
  }
  
  // ちょうど30個（またはそれ以上）の葉ノードが得られました。
  // 描画キャンバスで線が一切交差しないように、深さ優先探索（DFS）の順序で葉ノードを回収します。
  // DFSでは、常に successブランチ を先に、次に failureブランチ を探索することで、上から下に綺麗なトポロジカル順になります！
  const sortedSequences = [];
  function collectLeavesDFS(node) {
    if (!node.children) {
      sortedSequences.push(node);
      return;
    }
    collectLeavesDFS(node.children.success);
    collectLeavesDFS(node.children.failure);
  }
  collectLeavesDFS(rootNode);
  
  // 30個に正確に制限する
  const finalLeaves = sortedSequences.slice(0, 30);
  
  const sequences = finalLeaves.map((leaf, idx) => {
    const esIdx = Math.floor(Math.random() * endStates.length);
    const endStateId = endStates[esIdx].id;
    return {
      id: `seq_id_${String(e).padStart(2, '0')}_${String(idx + 1).padStart(2, '0')}`,
      name: `${ieCode}-SEQ-${String(idx + 1).padStart(2, '0')}`,
      path: leaf.path,
      endStateId: endStateId
    };
  });
  
  eventTrees.push({
    id: `et_id_${String(e).padStart(2, '0')}`,
    name: `ET_${String(e).padStart(2, '0')}`,
    initiatingEventId: ieId,
    functionalEvents: functionalEvents,
    sequences: sequences
  });
}

// 6. PRAModel の組み立て
const praModel = {
  id: "large-scale-test-model-uuid-001",
  name: "疑似巨大検証モデル",
  description: "計算速度検証用の巨大モデル（12,000基事象、30FT、20ET、60CCF等、子ノード数10個制限版）",
  version: 1,
  locale: "ja",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  faultTrees: faultTrees,
  eventTrees: eventTrees,
  basicEvents: basicEvents,
  parameters: [],
  houseEvents: [],
  ccfGroups: ccfGroups,
  initiatingEvents: initiatingEvents,
  endStates: endStates,
  seismicHazards: [],
  seismicFragilities: [],
  seismicSettings: {
    hazardCurveId: "",
    selectedETIds: [],
    minPGA: 0.1,
    maxPGA: 1.0,
    intervals: 10
  },
  quantificationSettings: {
    cutOff: 1e-9,
    approximation: "rare_event",
    monteCarloSamples: 10000,
    useLHS: true,
    runUncertainty: false
  }
};

// 7. ファイルの書き出し
console.log('5. JSONファイルへ書き出し中...');
try {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(praModel, null, 2), 'utf-8');
  
  const stats = fs.statSync(OUTPUT_FILE);
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`\n🎉 子ノード数制限版の疑似巨大モデルが正常に生成されました！`);
  console.log(`📁 保存先: ${OUTPUT_FILE}`);
  console.log(`📦 ファイルサイズ: ${sizeInMB} MB`);
  console.log(`📊 基本統計情報:`);
  console.log(`   - 起因事象数: ${initiatingEvents.length}`);
  console.log(`   - イベントツリー (ET) 数: ${eventTrees.length}`);
  console.log(`   - フォルトツリー (FT) 数: ${faultTrees.length}`);
  console.log(`   - ユニーク基本事象数: ${basicEvents.length}`);
  console.log(`   - CCFグループ数: ${ccfGroups.length}`);
  
} catch (error) {
  console.error('❌ ファイル書き出し中にエラーが発生しました:', error);
}
