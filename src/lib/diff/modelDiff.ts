// PRA Nexus — Model Diff Engine
// PRAModel に特化した差分計算

import type { PRAModel } from '@/lib/types';
import type { ProjectDiff, DiffCategory } from '@/lib/types/project';

/**
 * Compute human-readable diffs between two PRAModel snapshots.
 */
export function computeModelDiff(oldModel: PRAModel, newModel: PRAModel): ProjectDiff[] {
  const diffs: ProjectDiff[] = [];

  // Model-level properties
  if (oldModel.name !== newModel.name) {
    diffs.push({ path: 'name', type: 'modify', category: 'model', oldValue: oldModel.name, newValue: newModel.name, humanLabel: `モデル名を「${oldModel.name}」→「${newModel.name}」に変更` });
  }
  if (oldModel.description !== newModel.description) {
    diffs.push({ path: 'description', type: 'modify', category: 'model', oldValue: oldModel.description, newValue: newModel.description, humanLabel: `モデルの説明を変更` });
  }

  // Fault Trees
  diffNamedArray(oldModel.faultTrees, newModel.faultTrees, 'faultTrees', 'faultTree', 'フォールトツリー', diffs, (oldFT, newFT, basePath) => {
    if (oldFT.name !== newFT.name) {
      diffs.push({ path: `${basePath}.name`, type: 'modify', category: 'faultTree', oldValue: oldFT.name, newValue: newFT.name, humanLabel: `FT「${oldFT.name}」の名前を「${newFT.name}」に変更` });
    }
    // Gates
    diffNamedArray(oldFT.gates, newFT.gates, `${basePath}.gates`, 'faultTree', 'ゲート', diffs, (oldG, newG, gPath) => {
      if (oldG.type !== newG.type) {
        diffs.push({ path: `${gPath}.type`, type: 'modify', category: 'faultTree', oldValue: oldG.type, newValue: newG.type, humanLabel: `ゲート「${oldG.name}」のタイプを ${oldG.type} → ${newG.type} に変更` });
      }
      if (JSON.stringify(oldG.children.sort()) !== JSON.stringify(newG.children.sort())) {
        diffs.push({ path: `${gPath}.children`, type: 'modify', category: 'faultTree', oldValue: oldG.children, newValue: newG.children, humanLabel: `ゲート「${oldG.name}」の子要素を変更` });
      }
    });
  });

  // Event Trees
  diffNamedArray(oldModel.eventTrees, newModel.eventTrees, 'eventTrees', 'eventTree', 'イベントツリー', diffs, (oldET, newET, basePath) => {
    if (oldET.name !== newET.name) {
      diffs.push({ path: `${basePath}.name`, type: 'modify', category: 'eventTree', oldValue: oldET.name, newValue: newET.name, humanLabel: `ET「${oldET.name}」の名前を「${newET.name}」に変更` });
    }
    // Functional events count
    if (oldET.functionalEvents.length !== newET.functionalEvents.length) {
      diffs.push({ path: `${basePath}.functionalEvents`, type: 'modify', category: 'eventTree', oldValue: oldET.functionalEvents.length, newValue: newET.functionalEvents.length, humanLabel: `ET「${oldET.name}」の機能事象数を ${oldET.functionalEvents.length} → ${newET.functionalEvents.length} に変更` });
    }
    // Sequences count
    if (oldET.sequences.length !== newET.sequences.length) {
      diffs.push({ path: `${basePath}.sequences`, type: 'modify', category: 'eventTree', oldValue: oldET.sequences.length, newValue: newET.sequences.length, humanLabel: `ET「${oldET.name}」のシーケンス数を ${oldET.sequences.length} → ${newET.sequences.length} に変更` });
    }
  });

  // Basic Events
  diffNamedArray(oldModel.basicEvents, newModel.basicEvents, 'basicEvents', 'basicEvent', '基本事象', diffs, (oldBE, newBE, basePath) => {
    if (oldBE.name !== newBE.name) {
      diffs.push({ path: `${basePath}.name`, type: 'modify', category: 'basicEvent', oldValue: oldBE.name, newValue: newBE.name, humanLabel: `基本事象「${oldBE.name}」の名前を「${newBE.name}」に変更` });
    }
    if (oldBE.probability !== newBE.probability) {
      diffs.push({ path: `${basePath}.probability`, type: 'modify', category: 'basicEvent', oldValue: oldBE.probability, newValue: newBE.probability, humanLabel: `基本事象「${newBE.name}」の確率を ${oldBE.probability?.toExponential(2)} → ${newBE.probability?.toExponential(2)} に変更` });
    }
    if (oldBE.failureRate !== newBE.failureRate) {
      diffs.push({ path: `${basePath}.failureRate`, type: 'modify', category: 'basicEvent', oldValue: oldBE.failureRate, newValue: newBE.failureRate, humanLabel: `基本事象「${newBE.name}」の故障率を ${oldBE.failureRate?.toExponential(2)} → ${newBE.failureRate?.toExponential(2)} に変更` });
    }
    if (oldBE.distribution?.type !== newBE.distribution?.type) {
      diffs.push({ path: `${basePath}.distribution.type`, type: 'modify', category: 'basicEvent', oldValue: oldBE.distribution?.type, newValue: newBE.distribution?.type, humanLabel: `基本事象「${newBE.name}」の分布型を ${oldBE.distribution?.type} → ${newBE.distribution?.type} に変更` });
    }
  });

  // Parameters
  diffNamedArray(oldModel.parameters, newModel.parameters, 'parameters', 'parameter', 'パラメータ', diffs, (oldP, newP, basePath) => {
    if (oldP.value !== newP.value) {
      diffs.push({ path: `${basePath}.value`, type: 'modify', category: 'parameter', oldValue: oldP.value, newValue: newP.value, humanLabel: `パラメータ「${newP.name}」の値を ${oldP.value.toExponential(2)} → ${newP.value.toExponential(2)} に変更` });
    }
  });

  // CCF Groups
  diffNamedArray(oldModel.ccfGroups, newModel.ccfGroups, 'ccfGroups', 'ccf', 'CCFグループ', diffs, (oldC, newC, basePath) => {
    if (oldC.model !== newC.model) {
      diffs.push({ path: `${basePath}.model`, type: 'modify', category: 'ccf', oldValue: oldC.model, newValue: newC.model, humanLabel: `CCFグループ「${newC.name}」のモデルを ${oldC.model} → ${newC.model} に変更` });
    }
    if (oldC.members.length !== newC.members.length) {
      diffs.push({ path: `${basePath}.members`, type: 'modify', category: 'ccf', oldValue: oldC.members.length, newValue: newC.members.length, humanLabel: `CCFグループ「${newC.name}」のメンバー数を ${oldC.members.length} → ${newC.members.length} に変更` });
    }
  });

  // Initiating Events
  diffNamedArray(oldModel.initiatingEvents, newModel.initiatingEvents, 'initiatingEvents', 'initiatingEvent', '起因事象', diffs, (oldIE, newIE, basePath) => {
    if (oldIE.frequency !== newIE.frequency) {
      diffs.push({ path: `${basePath}.frequency`, type: 'modify', category: 'initiatingEvent', oldValue: oldIE.frequency, newValue: newIE.frequency, humanLabel: `起因事象「${newIE.name}」の頻度を ${oldIE.frequency.toExponential(2)} → ${newIE.frequency.toExponential(2)} に変更` });
    }
  });

  // End States
  diffNamedArray(oldModel.endStates, newModel.endStates, 'endStates', 'endState', '終状態', diffs, (oldES, newES, basePath) => {
    if (oldES.name !== newES.name) {
      diffs.push({ path: `${basePath}.name`, type: 'modify', category: 'endState', oldValue: oldES.name, newValue: newES.name, humanLabel: `終状態「${oldES.name}」の名前を「${newES.name}」に変更` });
    }
  });

  // Seismic Hazards
  diffNamedArray(oldModel.seismicHazards, newModel.seismicHazards, 'seismicHazards', 'seismicHazard', '地震ハザード', diffs);

  // Seismic Fragilities
  diffNamedArray(oldModel.seismicFragilities, newModel.seismicFragilities, 'seismicFragilities', 'seismicFragility', '地震フラジリティ', diffs);

  return diffs;
}

/**
 * Generic helper: diff two arrays of objects with { id, name } fields.
 */
function diffNamedArray<T extends { id: string; name?: string }>(
  oldArr: T[],
  newArr: T[],
  basePath: string,
  category: DiffCategory,
  label: string,
  diffs: ProjectDiff[],
  detailDiff?: (oldItem: T, newItem: T, itemPath: string) => void
) {
  const oldIds = new Set(oldArr.map(i => i.id));
  const newIds = new Set(newArr.map(i => i.id));

  // Added
  for (const item of newArr) {
    if (!oldIds.has(item.id)) {
      diffs.push({
        path: `${basePath}[${item.id}]`,
        type: 'add',
        category,
        newValue: item,
        humanLabel: `${label}「${(item as any).name || item.id}」を追加`
      });
    }
  }

  // Deleted
  for (const item of oldArr) {
    if (!newIds.has(item.id)) {
      diffs.push({
        path: `${basePath}[${item.id}]`,
        type: 'delete',
        category,
        oldValue: item,
        humanLabel: `${label}「${(item as any).name || item.id}」を削除`
      });
    }
  }

  // Modified (detail comparison)
  if (detailDiff) {
    for (const newItem of newArr) {
      const oldItem = oldArr.find(o => o.id === newItem.id);
      if (oldItem) {
        detailDiff(oldItem, newItem, `${basePath}[${newItem.id}]`);
      }
    }
  }
}

/**
 * Get summary statistics for a diff set.
 */
export function getDiffSummary(diffs: ProjectDiff[]) {
  return {
    total: diffs.length,
    added: diffs.filter(d => d.type === 'add').length,
    modified: diffs.filter(d => d.type === 'modify').length,
    deleted: diffs.filter(d => d.type === 'delete').length,
    byCategory: Object.entries(
      diffs.reduce((acc, d) => {
        acc[d.category] = (acc[d.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).sort((a, b) => b[1] - a[1])
  };
}
