'use client';

import React, { useState } from 'react';
import type { ProjectDiff, DiffCategory, NavigationTarget } from '@/lib/types/project';
import { getDiffSummary } from '@/lib/diff/modelDiff';

interface DiffViewerProps {
  diffs: ProjectDiff[];
  v1: number;
  v2: number;
  locale?: 'ja' | 'en';
  onNavigate?: (target: NavigationTarget) => void;
  onApplyDiff?: (diff: ProjectDiff, useOldValue: boolean) => void;
}

/**
 * Resolve a diff entry to a NavigationTarget for jump-to-entity.
 * Uses the diff path and category to determine where to navigate.
 */
function resolveNavigation(diff: ProjectDiff): NavigationTarget | null {
  const { path, category, oldValue, newValue } = diff;
  const entity = newValue || oldValue;
  const entityId = entity?.id;

  // Extract IDs from path like "faultTrees[<ftId>].gates[<gateId>].type"
  const idMatches = path.match(/\[([^\]]+)\]/g);

  switch (category) {
    case 'faultTree': {
      const ftId = idMatches?.[0]?.slice(1, -1);
      const gateId = idMatches?.[1]?.slice(1, -1);
      if (ftId) {
        return {
          view: 'editor',
          faultTreeId: ftId,
          nodeId: gateId || undefined,
          nodeType: gateId ? 'gate' : undefined,
          highlightId: gateId || ftId,
        };
      }
      return { view: 'editor' };
    }
    case 'eventTree': {
      const etId = idMatches?.[0]?.slice(1, -1);
      if (etId) {
        return {
          view: 'et_editor',
          eventTreeId: etId,
          highlightId: etId,
        };
      }
      return { view: 'et_editor' };
    }
    case 'basicEvent':
      return {
        view: 'data',
        dataTab: 'basicEvents',
        highlightId: entityId || idMatches?.[0]?.slice(1, -1),
      };
    case 'parameter':
      return {
        view: 'data',
        dataTab: 'parameters',
        highlightId: entityId || idMatches?.[0]?.slice(1, -1),
      };
    case 'ccf':
      return {
        view: 'data',
        dataTab: 'ccf',
        highlightId: entityId || idMatches?.[0]?.slice(1, -1),
      };
    case 'initiatingEvent':
      return {
        view: 'data',
        dataTab: 'initiatingEvents',
        highlightId: entityId || idMatches?.[0]?.slice(1, -1),
      };
    case 'endState':
      return {
        view: 'data',
        dataTab: 'endStates',
        highlightId: entityId || idMatches?.[0]?.slice(1, -1),
      };
    case 'seismicHazard':
    case 'seismicFragility':
    case 'seismicSettings':
      return { view: 'seismic' };
    case 'model':
      return null;
    default:
      return null;
  }
}

const CATEGORY_LABELS: Record<DiffCategory, { ja: string; en: string; icon: string }> = {
  model: { ja: 'モデル全般', en: 'Model', icon: '📄' },
  faultTree: { ja: 'フォールトツリー', en: 'Fault Tree', icon: '🌳' },
  eventTree: { ja: 'イベントツリー', en: 'Event Tree', icon: '🔀' },
  basicEvent: { ja: '基本事象', en: 'Basic Event', icon: '⚡' },
  parameter: { ja: 'パラメータ', en: 'Parameter', icon: '📊' },
  ccf: { ja: 'CCFグループ', en: 'CCF Group', icon: '🔗' },
  initiatingEvent: { ja: '起因事象', en: 'Initiating Event', icon: '💥' },
  endState: { ja: '終状態', en: 'End State', icon: '🏁' },
  seismicHazard: { ja: '地震ハザード', en: 'Seismic Hazard', icon: '🌊' },
  seismicFragility: { ja: '地震フラジリティ', en: 'Seismic Fragility', icon: '🏗️' },
  seismicSettings: { ja: '地震設定', en: 'Seismic Settings', icon: '⚙️' },
};

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  add: { bg: 'rgba(0, 214, 143, 0.15)', text: '#00D68F', label: '追加' },
  modify: { bg: 'rgba(255, 165, 2, 0.15)', text: '#FFA502', label: '変更' },
  delete: { bg: 'rgba(255, 71, 87, 0.15)', text: '#FF4757', label: '削除' },
};

// Pretty-print property labels for PRA entities
const PROPERTY_LABELS: Record<string, string> = {
  id: 'ID',
  name: '名前',
  type: 'タイプ',
  probability: '確率',
  failureRate: '故障率',
  repairTime: '修復時間 (h)',
  missionTime: 'ミッション時間 (h)',
  demands: '需要数',
  distribution: '分布',
  source: '出典',
  memo: 'メモ',
  tags: 'タグ',
  eventType: '事象タイプ',
  failureType: '故障タイプ',
  topGateId: 'トップゲートID',
  gates: 'ゲート',
  children: '子要素',
  position: '位置',
  collapsed: '折りたたみ',
  initiatingEventId: '起因事象ID',
  functionalEvents: '機能事象',
  sequences: 'シーケンス',
  frequency: '頻度 (/yr)',
  code: 'コード',
  description: '説明',
  model: 'モデル',
  members: 'メンバー',
  parameters: 'パラメータ',
  categories: 'カテゴリ',
  color: '色',
  linkedFaultTreeId: 'リンクFT',
  branches: '分岐',
  am: '中央容量 Am',
  betaR: 'βR (ランダム)',
  betaU: 'βU (不確実)',
  points: 'データポイント',
  fractiles: 'フラクタイル',
  seismicFragilityId: '地震フラジリティID',
  parameterId: 'パラメータID',
  value: '値',
  errorFactor: '誤差係数',
  stdDev: '標準偏差',
  lower: '下限',
  upper: '上限',
  shape: '形状パラメータ',
  scale: '尺度パラメータ',
  alpha: 'α',
  beta: 'β',
  mean: '平均',
};

// Keys to skip in detail view (internal/uninteresting)
const SKIP_KEYS = new Set(['id', 'position', 'collapsed']);

function formatValue(val: any): string {
  if (val === undefined || val === null) return '—';
  if (typeof val === 'number') {
    if (Math.abs(val) < 0.01 && val !== 0) return val.toExponential(4);
    if (Number.isInteger(val)) return String(val);
    return val.toPrecision(6);
  }
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (Array.isArray(val)) {
    if (val.length === 0) return '(空)';
    if (val.length <= 3 && val.every(v => typeof v === 'string')) return val.join(', ');
    return `[${val.length} 件]`;
  }
  if (typeof val === 'object') {
    // Special handling for distribution objects
    if (val.type) {
      const parts = [`type: ${val.type}`];
      if (val.mean !== undefined) parts.push(`mean: ${formatValue(val.mean)}`);
      if (val.errorFactor !== undefined) parts.push(`EF: ${val.errorFactor}`);
      if (val.stdDev !== undefined) parts.push(`σ: ${formatValue(val.stdDev)}`);
      return `{ ${parts.join(', ')} }`;
    }
    return JSON.stringify(val, null, 0).slice(0, 100);
  }
  return String(val);
}

/** Renders the detail panel for a single entity (add/delete) */
function EntityDetail({ entity, type, locale }: { entity: any; type: 'add' | 'delete'; locale: string }) {
  if (!entity || typeof entity !== 'object') return null;
  const color = type === 'add' ? TYPE_COLORS.add.text : TYPE_COLORS.delete.text;
  const bgColor = type === 'add' ? TYPE_COLORS.add.bg : TYPE_COLORS.delete.bg;

  const entries = Object.entries(entity).filter(([k]) => !SKIP_KEYS.has(k));

  return (
    <div style={{ marginTop: 8, background: bgColor, borderRadius: 6, padding: '10px 12px', border: `1px solid ${color}25` }}>
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color, opacity: 0.8 }}>
        {type === 'add' ? (locale === 'ja' ? '追加されたオブジェクト' : 'Added Object') : (locale === 'ja' ? '削除されたオブジェクト' : 'Deleted Object')}
      </div>
      <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
        <tbody>
          {entries.map(([key, val]) => (
            <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '3px 8px 3px 0', fontWeight: 600, opacity: 0.6, whiteSpace: 'nowrap', width: 120, verticalAlign: 'top' }}>
                {PROPERTY_LABELS[key] || key}
              </td>
              <td style={{ padding: '3px 0', fontFamily: 'monospace', color, wordBreak: 'break-all' }}>
                {formatValue(val)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Renders a side-by-side comparison for a modify diff */
function ModifyDetail({ diff, locale }: { diff: ProjectDiff; locale: string }) {
  const oldVal = diff.oldValue;
  const newVal = diff.newValue;

  // For simple scalar values, show inline
  if (typeof oldVal !== 'object' || oldVal === null) {
    return (
      <div style={{ marginTop: 8, background: 'var(--bg-canvas)', borderRadius: 6, padding: '10px 12px', border: '1px solid var(--border-default)' }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: 10, opacity: 0.5, fontWeight: 600, width: 120 }}>
                {locale === 'ja' ? 'プロパティ' : 'Property'}
              </th>
              <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: 10, color: TYPE_COLORS.delete.text, fontWeight: 600 }}>
                v{locale === 'ja' ? '旧' : 'Old'}
              </th>
              <th style={{ width: 24 }}></th>
              <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: 10, color: TYPE_COLORS.add.text, fontWeight: 600 }}>
                v{locale === 'ja' ? '新' : 'New'}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '4px 8px', fontWeight: 600, opacity: 0.6, fontSize: 11 }}>
                {PROPERTY_LABELS[diff.path.split('.').pop() || ''] || diff.path.split('.').pop()}
              </td>
              <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11, color: TYPE_COLORS.delete.text, background: TYPE_COLORS.delete.bg, borderRadius: 4 }}>
                {formatValue(oldVal)}
              </td>
              <td style={{ textAlign: 'center', opacity: 0.3 }}>→</td>
              <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 11, color: TYPE_COLORS.add.text, background: TYPE_COLORS.add.bg, borderRadius: 4 }}>
                {formatValue(newVal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // For complex objects (arrays, nested objects), show key-by-key comparison
  const allKeys = Array.from(new Set([...Object.keys(oldVal || {}), ...Object.keys(newVal || {})])).filter(k => !SKIP_KEYS.has(k));
  const changedKeys = allKeys.filter(k => JSON.stringify((oldVal as any)?.[k]) !== JSON.stringify((newVal as any)?.[k]));

  if (changedKeys.length === 0) return null;

  return (
    <div style={{ marginTop: 8, background: 'var(--bg-canvas)', borderRadius: 6, padding: '10px 12px', border: '1px solid var(--border-default)' }}>
      <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 6, opacity: 0.5 }}>
        {locale === 'ja' ? `${changedKeys.length} 件のプロパティが変更` : `${changedKeys.length} properties changed`}
      </div>
      <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: 10, opacity: 0.5, fontWeight: 600, width: 120 }}>
              {locale === 'ja' ? 'プロパティ' : 'Property'}
            </th>
            <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: 10, color: TYPE_COLORS.delete.text, fontWeight: 600 }}>
              {locale === 'ja' ? '旧' : 'Old'}
            </th>
            <th style={{ width: 24 }}></th>
            <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: 10, color: TYPE_COLORS.add.text, fontWeight: 600 }}>
              {locale === 'ja' ? '新' : 'New'}
            </th>
          </tr>
        </thead>
        <tbody>
          {changedKeys.map(key => (
            <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '4px 8px', fontWeight: 600, opacity: 0.6, whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                {PROPERTY_LABELS[key] || key}
              </td>
              <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: TYPE_COLORS.delete.text, background: TYPE_COLORS.delete.bg, borderRadius: 4, wordBreak: 'break-all' }}>
                {formatValue((oldVal as any)?.[key])}
              </td>
              <td style={{ textAlign: 'center', opacity: 0.3, verticalAlign: 'top' }}>→</td>
              <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: TYPE_COLORS.add.text, background: TYPE_COLORS.add.bg, borderRadius: 4, wordBreak: 'break-all' }}>
                {formatValue((newVal as any)?.[key])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DiffViewer({ diffs, v1, v2, locale = 'ja', onNavigate, onApplyDiff }: DiffViewerProps) {
  const [categoryFilter, setCategoryFilter] = useState<DiffCategory | 'all'>('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const summary = getDiffSummary(diffs);

  const filteredDiffs = categoryFilter === 'all'
    ? diffs
    : diffs.filter(d => d.category === categoryFilter);

  const handleToggle = (i: number) => {
    setExpandedIndex(expandedIndex === i ? null : i);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>
          {locale === 'ja' ? `v${v1} → v${v2} の差分` : `Diff: v${v1} → v${v2}`}
        </h3>
        {/* Summary Cards */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ padding: '8px 16px', borderRadius: 8, background: TYPE_COLORS.add.bg, border: `1px solid ${TYPE_COLORS.add.text}30`, fontSize: 13 }}>
            <span style={{ color: TYPE_COLORS.add.text, fontWeight: 700 }}>+{summary.added}</span>
            <span style={{ marginLeft: 4, opacity: 0.7, fontSize: 11 }}>{locale === 'ja' ? '追加' : 'Added'}</span>
          </div>
          <div style={{ padding: '8px 16px', borderRadius: 8, background: TYPE_COLORS.modify.bg, border: `1px solid ${TYPE_COLORS.modify.text}30`, fontSize: 13 }}>
            <span style={{ color: TYPE_COLORS.modify.text, fontWeight: 700 }}>~{summary.modified}</span>
            <span style={{ marginLeft: 4, opacity: 0.7, fontSize: 11 }}>{locale === 'ja' ? '変更' : 'Modified'}</span>
          </div>
          <div style={{ padding: '8px 16px', borderRadius: 8, background: TYPE_COLORS.delete.bg, border: `1px solid ${TYPE_COLORS.delete.text}30`, fontSize: 13 }}>
            <span style={{ color: TYPE_COLORS.delete.text, fontWeight: 700 }}>-{summary.deleted}</span>
            <span style={{ marginLeft: 4, opacity: 0.7, fontSize: 11 }}>{locale === 'ja' ? '削除' : 'Deleted'}</span>
          </div>
          <div style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', fontSize: 13 }}>
            <span style={{ fontWeight: 700 }}>{summary.total}</span>
            <span style={{ marginLeft: 4, opacity: 0.7, fontSize: 11 }}>{locale === 'ja' ? '合計' : 'Total'}</span>
          </div>
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            className={`btn btn--sm ${categoryFilter === 'all' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => { setCategoryFilter('all'); setExpandedIndex(null); }}
            style={{ fontSize: 11 }}
          >
            {locale === 'ja' ? 'すべて' : 'All'} ({summary.total})
          </button>
          {summary.byCategory.map(([cat, count]) => {
            const catInfo = CATEGORY_LABELS[cat as DiffCategory];
            return (
              <button
                key={cat}
                className={`btn btn--sm ${categoryFilter === cat ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => { setCategoryFilter(cat as DiffCategory); setExpandedIndex(null); }}
                style={{ fontSize: 11 }}
              >
                {catInfo?.icon} {locale === 'ja' ? catInfo?.ja : catInfo?.en} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Diff List */}
      {filteredDiffs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, opacity: 0.5 }}>
          {locale === 'ja' ? '差分なし' : 'No differences'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredDiffs.map((d, i) => {
            const typeStyle = TYPE_COLORS[d.type];
            const catInfo = CATEGORY_LABELS[d.category];
            const isExpanded = expandedIndex === i;
            const hasDetail = d.oldValue !== undefined || d.newValue !== undefined;

            return (
              <div
                key={i}
                style={{
                  background: isExpanded ? 'var(--bg-secondary)' : typeStyle.bg,
                  borderRadius: 8,
                  borderLeft: `3px solid ${typeStyle.text}`,
                  fontSize: 13,
                  transition: 'all 0.15s ease',
                  border: isExpanded ? `1px solid ${typeStyle.text}50` : undefined,
                }}
              >
                {/* Clickable Header */}
                <div
                  onClick={() => hasDetail && handleToggle(i)}
                  style={{
                    padding: '10px 14px',
                    cursor: hasDetail ? 'pointer' : 'default',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      padding: '1px 6px', borderRadius: 4,
                      color: typeStyle.text, background: `${typeStyle.text}20`,
                    }}>
                      {typeStyle.label}
                    </span>
                    <span style={{ opacity: 0.5, fontSize: 11 }}>{catInfo?.icon}</span>
                    <span>{d.humanLabel}</span>
                  </div>
                  {hasDetail && (
                    <span style={{
                      fontSize: 10, opacity: 0.5, marginLeft: 8,
                      transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      display: 'inline-block',
                    }}>
                      ▼
                    </span>
                  )}
                </div>

                {/* Inline old→new preview (collapsed) */}
                {!isExpanded && d.type === 'modify' && d.oldValue !== undefined && d.newValue !== undefined && typeof d.oldValue !== 'object' && (
                  <div style={{ padding: '0 14px 8px', fontSize: 11, opacity: 0.7, fontFamily: 'monospace' }}>
                    <span style={{ color: TYPE_COLORS.delete.text, textDecoration: 'line-through' }}>
                      {formatValue(d.oldValue)}
                    </span>
                    <span style={{ margin: '0 8px' }}>→</span>
                    <span style={{ color: TYPE_COLORS.add.text }}>
                      {formatValue(d.newValue)}
                    </span>
                  </div>
                )}

                {/* Expanded Detail Panel */}
                {isExpanded && (
                  <div style={{ padding: '0 14px 12px' }}>
                    {d.type === 'add' && d.newValue && (
                      <EntityDetail entity={d.newValue} type="add" locale={locale} />
                    )}
                    {d.type === 'delete' && d.oldValue && (
                      <EntityDetail entity={d.oldValue} type="delete" locale={locale} />
                    )}
                    {d.type === 'modify' && (
                      <ModifyDetail diff={d} locale={locale} />
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      {/* Jump to entity button */}
                      {onNavigate && resolveNavigation(d) && d.type !== 'delete' && (
                        <button
                          className="btn btn--primary btn--sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const target = resolveNavigation(d);
                            if (target) onNavigate(target);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 11, padding: '6px 14px',
                            borderRadius: 6,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                          }}
                        >
                          <span style={{ fontSize: 14 }}>📍</span>
                          <span style={{ fontWeight: 600 }}>
                            {locale === 'ja'
                              ? {
                                  editor: 'FTエディタで表示',
                                  et_editor: 'ETエディタで表示',
                                  data: 'データテーブルで表示',
                                  seismic: '地震PRAで表示',
                                }[resolveNavigation(d)!.view]
                              : `Open in ${resolveNavigation(d)!.view}`
                            }
                          </span>
                        </button>
                      )}

                      {/* Merge/Restore Buttons */}
                      {onApplyDiff && (
                        <>
                          <button
                            className="btn btn--ghost btn--sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onApplyDiff(d, true);
                            }}
                            style={{ fontSize: 11, border: `1px solid ${TYPE_COLORS.delete.text}50`, color: TYPE_COLORS.delete.text }}
                            title={locale === 'ja' ? `左側の値（v${v1}）を現在のモデルに反映します` : `Apply v${v1} value to current model`}
                          >
                            🔙 {locale === 'ja' ? `v${v1} の値に復元` : `Restore v${v1}`}
                          </button>
                          <button
                            className="btn btn--ghost btn--sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onApplyDiff(d, false);
                            }}
                            style={{ fontSize: 11, border: `1px solid ${TYPE_COLORS.add.text}50`, color: TYPE_COLORS.add.text }}
                            title={locale === 'ja' ? `右側の値（v${v2}）を現在のモデルに反映します` : `Apply v${v2} value to current model`}
                          >
                            ⏭ {locale === 'ja' ? `v${v2} の値を反映` : `Apply v${v2}`}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 10, opacity: 0.4, textAlign: 'center' }}>
        {locale === 'ja' ? '各項目をクリックすると詳細を表示します' : 'Click an item to view details'}
      </div>
    </div>
  );
}
