'use client';

import React from 'react';
import type { BasicEvent, Gate, GateType } from '@/lib/types';
import { useModelStore } from '@/store/modelStore';

interface BasicEventIDInputProps {
  basicEvent: BasicEvent;
  updateBasicEvent: (event: BasicEvent) => void;
  locale: 'ja' | 'en';
}

function BasicEventIDInput({ basicEvent, updateBasicEvent, locale }: BasicEventIDInputProps) {
  const [localEventId, setLocalEventId] = React.useState(basicEvent.eventId || '');

  React.useEffect(() => {
    setLocalEventId(basicEvent.eventId || '');
  }, [basicEvent.id, basicEvent.eventId]);

  const commitEventId = () => {
    const trimmedId = localEventId.trim();
    const currentId = basicEvent.eventId || '';
    
    if (trimmedId === currentId) return;

    // 重複チェック
    const basicEvents = useModelStore.getState().model.basicEvents;
    const sameIdEvent = trimmedId 
      ? basicEvents.find(e => e.id !== basicEvent.id && e.eventId === trimmedId)
      : null;

    if (sameIdEvent) {
      if ((window as any).__is_confirming_id__) return;
      (window as any).__is_confirming_id__ = true;

      const confirmSync = window.confirm(
        `基事象ID "${trimmedId}" は既に存在します。\n既存の基事象「${sameIdEvent.name}」のデータ（故障率、ミッション時間、分布など）をこの基本事象に反映しますか？`
      );

      (window as any).__is_confirming_id__ = false;

      if (confirmSync) {
        updateBasicEvent({
          ...basicEvent,
          eventId: trimmedId,
          name: sameIdEvent.name,
          tags: sameIdEvent.tags || [],
          failureType: sameIdEvent.failureType,
          failureRate: sameIdEvent.failureRate,
          repairTime: sameIdEvent.repairTime,
          probability: sameIdEvent.probability,
          missionTime: sameIdEvent.missionTime,
          demands: sameIdEvent.demands,
          distribution: JSON.parse(JSON.stringify(sameIdEvent.distribution)),
          parameterId: sameIdEvent.parameterId,
          source: sameIdEvent.source || '',
          memo: sameIdEvent.memo || '',
          seismicFragilityId: sameIdEvent.seismicFragilityId,
          __force_sync_others__: true
        } as any);
      } else {
        updateBasicEvent({
          ...basicEvent,
          eventId: trimmedId,
          __force_sync_others__: false
        } as any);
      }
    } else {
      updateBasicEvent({
        ...basicEvent,
        eventId: trimmedId,
        __force_sync_others__: true
      } as any);
    }
  };

  return (
    <input
      className="form-input form-input--mono"
      placeholder={locale === 'ja' ? '例: BE-01' : 'e.g. BE-01'}
      value={localEventId}
      onChange={(e) => setLocalEventId(e.target.value)}
      onBlur={commitEventId}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commitEventId();
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}


interface PropertyPanelProps {
  selectedNodeId: string | null;
  selectedNodeType: string | null;
  selectedFaultTreeId: string | null;
  locale?: 'ja' | 'en';
}

export default function PropertyPanel({ 
  selectedNodeId, 
  selectedNodeType, 
  selectedFaultTreeId: propSelectedFaultTreeId,
  locale = 'ja' 
}: PropertyPanelProps) {
  const model = useModelStore((s) => s.model);
  const updateBasicEvent = useModelStore((s) => s.updateBasicEvent);
  const updateGate = useModelStore((s) => s.updateGate);
  const convertToSubtree = useModelStore((s) => s.convertToSubtree);
  const selectFaultTree = useModelStore((s) => s.selectFaultTree);
  const storeSelectedFaultTreeId = useModelStore((s) => s.selectedFaultTreeId);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [lastConversion, setLastConversion] = React.useState<{ from: string, to: string } | null>(null);
  
  // Robust ID resolution: prop > store > inverse lookup from gate
  let selectedFaultTreeId = propSelectedFaultTreeId || storeSelectedFaultTreeId;
  if (!selectedFaultTreeId && selectedNodeId) {
    const parentFT = model.faultTrees.find(ft => ft.gates.some(g => g.id === selectedNodeId));
    if (parentFT) selectedFaultTreeId = parentFT.id;
  }

  if (!selectedNodeId || !selectedNodeType) {
    return (
      <div className="property-panel">
        <div className="empty-state" style={{ height: '100%' }}>
          <div className="empty-state__icon">📋</div>
          <div className="empty-state__title">
            {locale === 'ja' ? 'プロパティ' : 'Properties'}
          </div>
          <div className="empty-state__description">
            {locale === 'ja' ? 'ノードを選択して編集' : 'Select a node to edit'}
          </div>
        </div>
      </div>
    );
  }

  // Find the event or gate
  const basicEvent = model.basicEvents.find((e) => e.id === selectedNodeId);
  const gate = selectedFaultTreeId
    ? model.faultTrees.find((ft) => ft.id === selectedFaultTreeId)?.gates.find((g) => g.id === selectedNodeId)
    : null;

  if (basicEvent) {
    return (
      <div className="property-panel animate-slideIn">
        <div className="property-panel__header">
          <span className="property-panel__title">
            {locale === 'ja' ? '基事象 プロパティ' : 'Basic Event Properties'}
          </span>
          <span className="badge badge--success">BE</span>
        </div>

        <div className="property-panel__section">
          <div className="property-panel__section-title">
            {locale === 'ja' ? '基本情報' : 'Basic Info'}
          </div>
          <div className="form-group">
            <label className="form-label">{locale === 'ja' ? '基事象ID' : 'Basic Event ID'}</label>
            <BasicEventIDInput
              basicEvent={basicEvent}
              updateBasicEvent={updateBasicEvent}
              locale={locale}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{locale === 'ja' ? '機器名称' : 'Name'}</label>
            <input
              className="form-input"
              value={basicEvent.name}
              onChange={(e) => updateBasicEvent({ ...basicEvent, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{locale === 'ja' ? 'タグ' : 'Tags'}</label>
            <input
              className="form-input"
              value={basicEvent.tags.join(', ')}
              onChange={(e) => updateBasicEvent({ ...basicEvent, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
              placeholder={locale === 'ja' ? 'カンマ区切り' : 'Comma separated'}
            />
          </div>
        </div>

        {basicEvent.eventType !== 'transferGate' && (
          <>
            <div className="property-panel__section">
              <div className="property-panel__section-title">
                {locale === 'ja' ? '故障データ' : 'Failure Data'}
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ja' ? '参照パラメータ' : 'Reference Parameter'}</label>
                <select
                  className="form-select"
                  value={basicEvent.parameterId || ''}
                  onChange={(e) => {
                    const pid = e.target.value;
                    if (!pid) {
                      updateBasicEvent({ ...basicEvent, parameterId: undefined });
                    } else {
                      const param = (model.parameters || []).find(p => p.id === pid);
                      if (param) {
                        updateBasicEvent({
                          ...basicEvent,
                          parameterId: pid,
                          failureType: param.failureType,
                          failureRate: param.value,
                          probability: param.failureType === 'demand'
                            ? param.value * (basicEvent.demands ?? 1)
                            : param.value * (basicEvent.missionTime ?? 24)
                        });
                      }
                    }
                  }}
                >
                  <option value="">{locale === 'ja' ? 'なし (個別設定)' : 'None (Custom)'}</option>
                  {(model.parameters || []).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ja' ? '故障率タイプ' : 'Failure Type'}</label>
                <select
                  className="form-select"
                  value={basicEvent.failureType || 'time'}
                  disabled={!!basicEvent.parameterId}
                  onChange={(e) => {
                    const newType = e.target.value as 'time' | 'demand';
                    updateBasicEvent({
                      ...basicEvent,
                      failureType: newType,
                      probability: newType === 'demand'
                        ? basicEvent.failureRate * (basicEvent.demands ?? 1)
                        : basicEvent.failureRate * (basicEvent.missionTime ?? 24)
                    });
                  }}
                >
                  <option value="time">{locale === 'ja' ? '時間故障率' : 'Time-based'}</option>
                  <option value="demand">{locale === 'ja' ? 'デマンド故障率' : 'Demand-based'}</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  {basicEvent.failureType === 'demand'
                    ? (locale === 'ja' ? 'デマンド故障率 [/demand]' : 'Failure Rate [/demand]')
                    : (locale === 'ja' ? '時間故障率 [/hr]' : 'Failure Rate [/hr]')}
                </label>
                <input
                  className="form-input form-input--mono"
                  type="number"
                  step="0.000001"
                  disabled={!!basicEvent.parameterId}
                  value={basicEvent.failureRate}
                  onChange={(e) => {
                    const newRate = parseFloat(e.target.value) || 0;
                    updateBasicEvent({
                      ...basicEvent,
                      failureRate: newRate,
                      probability: basicEvent.failureType === 'demand'
                        ? newRate * (basicEvent.demands ?? 1)
                        : newRate * (basicEvent.missionTime ?? 24)
                    });
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ja' ? '確率 (自動計算)' : 'Probability (Auto)'}</label>
                <input
                  className="form-input form-input--mono"
                  style={{ opacity: 0.7, backgroundColor: 'var(--bg-secondary)' }}
                  type="number"
                  readOnly
                  value={basicEvent.probability ?? ''}
                />
              </div>
              {basicEvent.failureType !== 'demand' && (
                <div className="form-group">
                  <label className="form-label">{locale === 'ja' ? '復旧時間 [hr]' : 'Repair Time [hr]'}</label>
                  <input
                    className="form-input form-input--mono"
                    type="number"
                    step="any"
                    value={basicEvent.repairTime ?? ''}
                    onChange={(e) => updateBasicEvent({ ...basicEvent, repairTime: parseFloat(e.target.value) || undefined })}
                  />
                </div>
              )}
              {basicEvent.failureType === 'demand' ? (
                <div className="form-group">
                  <label className="form-label">{locale === 'ja' ? 'デマンド数' : 'Demands'}</label>
                  <input
                    className="form-input form-input--mono"
                    type="number"
                    min="1"
                    step="1"
                    value={basicEvent.demands ?? 1}
                    onChange={(e) => {
                      const newDemands = parseInt(e.target.value) || 1;
                      updateBasicEvent({
                        ...basicEvent,
                        demands: newDemands,
                        probability: basicEvent.failureRate * newDemands
                      });
                    }}
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">{locale === 'ja' ? 'ミッション時間 [hr]' : 'Mission Time [hr]'}</label>
                  <input
                    className="form-input form-input--mono"
                    type="number"
                    step="any"
                    value={basicEvent.missionTime ?? ''}
                    onChange={(e) => {
                      const newTime = parseFloat(e.target.value) || undefined;
                      updateBasicEvent({
                        ...basicEvent,
                        missionTime: newTime,
                        probability: basicEvent.failureRate * (newTime ?? 24)
                      });
                    }}
                  />
                </div>
              )}
            </div>

            <div className="property-panel__section">
              <div className="property-panel__section-title">
                {locale === 'ja' ? '分布形状' : 'Distribution'}
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ja' ? 'タイプ' : 'Type'}</label>
                <select
                  className="form-select"
                  value={basicEvent.distribution.type}
                  onChange={(e) => updateBasicEvent({
                    ...basicEvent,
                    distribution: { ...basicEvent.distribution, type: e.target.value as any }
                  })}
                >
                  <option value="point">Point</option>
                  <option value="lognormal">Lognormal</option>
                  <option value="normal">Normal</option>
                  <option value="uniform">Uniform</option>
                  <option value="beta">Beta</option>
                  <option value="gamma">Gamma</option>
                  <option value="weibull">Weibull</option>
                </select>
              </div>

              <div style={{ padding: 'var(--space-sm)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                {basicEvent.distribution.type === 'lognormal' && (
                  <div className="form-group">
                    <label className="form-label">Error Factor</label>
                    <input
                      className="form-input form-input--mono"
                      type="number"
                      step="any"
                      value={basicEvent.distribution.errorFactor ?? 3}
                      onChange={(e) => updateBasicEvent({
                        ...basicEvent,
                        distribution: { ...basicEvent.distribution, errorFactor: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                )}
                {basicEvent.distribution.type === 'normal' && (
                  <div className="form-group">
                    <label className="form-label">Std Deviation</label>
                    <input
                      className="form-input form-input--mono"
                      type="number"
                      step="any"
                      value={basicEvent.distribution.stdDev ?? 0}
                      onChange={(e) => updateBasicEvent({
                        ...basicEvent,
                        distribution: { ...basicEvent.distribution, stdDev: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                )}
                {basicEvent.distribution.type === 'uniform' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="form-group">
                      <label className="form-label">Min</label>
                      <input
                        className="form-input form-input--mono"
                        type="number"
                        step="any"
                        value={basicEvent.distribution.lower ?? 0}
                        onChange={(e) => updateBasicEvent({
                          ...basicEvent,
                          distribution: { ...basicEvent.distribution, lower: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Max</label>
                      <input
                        className="form-input form-input--mono"
                        type="number"
                        step="any"
                        value={basicEvent.distribution.upper ?? 0}
                        onChange={(e) => updateBasicEvent({
                          ...basicEvent,
                          distribution: { ...basicEvent.distribution, upper: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  </div>
                )}
                {(basicEvent.distribution.type === 'gamma' || basicEvent.distribution.type === 'weibull') && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="form-group">
                      <label className="form-label">Shape (k)</label>
                      <input
                        className="form-input form-input--mono"
                        type="number"
                        step="any"
                        value={basicEvent.distribution.shape ?? 1.5}
                        onChange={(e) => updateBasicEvent({
                          ...basicEvent,
                          distribution: { ...basicEvent.distribution, shape: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Scale (θ/λ)</label>
                      <input
                        className="form-input form-input--mono"
                        type="number"
                        step="any"
                        value={basicEvent.distribution.scale ?? 0}
                        onChange={(e) => updateBasicEvent({
                          ...basicEvent,
                          distribution: { ...basicEvent.distribution, scale: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  </div>
                )}
                {basicEvent.distribution.type === 'beta' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="form-group">
                      <label className="form-label">Alpha (α)</label>
                      <input
                        className="form-input form-input--mono"
                        type="number"
                        step="any"
                        value={basicEvent.distribution.alpha ?? 2}
                        onChange={(e) => updateBasicEvent({
                          ...basicEvent,
                          distribution: { ...basicEvent.distribution, alpha: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Beta (β)</label>
                      <input
                        className="form-input form-input--mono"
                        type="number"
                        step="any"
                        value={basicEvent.distribution.beta ?? 10}
                        onChange={(e) => updateBasicEvent({
                          ...basicEvent,
                          distribution: { ...basicEvent.distribution, beta: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  </div>
                )}
                {basicEvent.distribution.type === 'point' && (
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-xs)' }}>
                    {locale === 'ja' ? '不確かさなし (固定値)' : 'No uncertainty (Fixed value)'}
                  </div>
                )}
              </div>
            </div>

            <div className="property-panel__section">
              <div className="property-panel__section-title">
                {locale === 'ja' ? '地震設定' : 'Seismic Settings'}
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ja' ? 'フラジリティ曲線' : 'Fragility Curve'}</label>
                <select
                  className="form-select"
                  value={basicEvent.seismicFragilityId || ''}
                  onChange={(e) => updateBasicEvent({ ...basicEvent, seismicFragilityId: e.target.value || undefined })}
                >
                  <option value="">-- {locale === 'ja' ? '未割当' : 'Not Assigned'} --</option>
                  {(model.seismicFragilities || []).map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {basicEvent.eventType === 'transferGate' && (
          <div className="property-panel__section animate-slideIn">
            <div className="property-panel__section-title">
              {locale === 'ja' ? 'トランスファ設定' : 'Transfer Settings'}
            </div>
            <div className="form-group">
              <label className="form-label">{locale === 'ja' ? 'リンク先FT' : 'Linked Fault Tree'}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  className="form-select"
                  style={{ flex: 1 }}
                  value={basicEvent.linkedFaultTreeId || ''}
                  onChange={(e) => updateBasicEvent({ ...basicEvent, linkedFaultTreeId: e.target.value })}
                >
                  <option value="">-- {locale === 'ja' ? '未選択' : 'Select Tree'} --</option>
                  {model.faultTrees.filter(f => f.id !== selectedFaultTreeId).map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {basicEvent.linkedFaultTreeId && (
                  <button 
                    className="btn btn--secondary btn--sm"
                    onClick={() => selectFaultTree(basicEvent.linkedFaultTreeId || null)}
                  >
                    GO
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="property-panel__section">
          <div className="property-panel__section-title">
            {locale === 'ja' ? 'データソース' : 'Source'}
          </div>
          <div className="form-group">
            <label className="form-label">Source</label>
            <input
              className="form-input"
              value={basicEvent.source}
              onChange={(e) => updateBasicEvent({ ...basicEvent, source: e.target.value })}
              placeholder="e.g., NUREG/CR-6928"
            />
          </div>
          <div className="form-group">
            <label className="form-label">{locale === 'ja' ? 'メモ' : 'Memo'}</label>
            <textarea
              className="form-textarea"
              value={basicEvent.memo}
              onChange={(e) => updateBasicEvent({ ...basicEvent, memo: e.target.value })}
            />
          </div>
        </div>
      </div>
    );
  }

  if (gate) {
    return (
      <div className="property-panel animate-slideIn">
        <div className="property-panel__header">
          <span className="property-panel__title">
            {locale === 'ja' ? 'ゲート プロパティ' : 'Gate Properties'}
          </span>
          <span className="badge badge--info">{gate.type}</span>
        </div>

        <div className="property-panel__section">
          <div className="form-group">
            <label className="form-label">{locale === 'ja' ? '名前' : 'Name'}</label>
            <input
              className="form-input"
              value={gate.name}
              onChange={(e) => {
                if (selectedFaultTreeId) {
                  updateGate(selectedFaultTreeId, { ...gate, name: e.target.value });
                }
              }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{locale === 'ja' ? 'ゲートタイプ' : 'Gate Type'}</label>
            <select
              className="form-select"
              value={gate.type}
              onChange={(e) => {
                if (selectedFaultTreeId) {
                  updateGate(selectedFaultTreeId, { ...gate, type: e.target.value as GateType });
                }
              }}
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
              <option value="ATLEAST">ATLEAST (K/N)</option>
              <option value="NOT">NOT</option>
              <option value="XOR">XOR</option>
              <option value="VOTE">VOTE</option>
              <option value="TRANSFER">TRANSFER</option>
            </select>
          </div>

          {gate.type === 'TRANSFER' && (
            <div className="form-group animate-fadeIn">
              <label className="form-label">{locale === 'ja' ? 'リンク先FT' : 'Linked Fault Tree'}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  className="form-select"
                  style={{ flex: 1 }}
                  value={gate.linkedFaultTreeId || ''}
                  onChange={(e) => {
                    if (selectedFaultTreeId) {
                      updateGate(selectedFaultTreeId, { ...gate, linkedFaultTreeId: e.target.value });
                    }
                  }}
                >
                  <option value="">-- {locale === 'ja' ? '未選択' : 'Select Tree'} --</option>
                  {model.faultTrees.filter(f => f.id !== selectedFaultTreeId).map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {gate.linkedFaultTreeId && (
                  <button 
                    className="btn btn--secondary btn--sm"
                    onClick={() => selectFaultTree(gate.linkedFaultTreeId || null)}
                  >
                    GO
                  </button>
                )}
              </div>
            </div>
          )}
          {(gate.type === 'ATLEAST' || gate.type === 'VOTE') && (
            <div className="form-group">
              <label className="form-label">K value</label>
              <input
                className="form-input form-input--mono"
                type="number"
                min="1"
                value={gate.k ?? 1}
                onChange={(e) => {
                  if (selectedFaultTreeId) {
                    updateGate(selectedFaultTreeId, { ...gate, k: parseInt(e.target.value) || 1 });
                  }
                }}
              />
            </div>
          )}
        </div>

        <div className="property-panel__section">
          <div className="property-panel__section-title">
            {locale === 'ja' ? '系統別管理' : 'Componentization'}
          </div>
          {gate.type !== 'TRANSFER' ? (
            <>
              <button
                type="button"
                className="btn btn--outline btn--sm w-full"
                style={{ 
                  marginTop: '8px', 
                  justifyContent: 'center',
                  backgroundColor: isProcessing ? 'var(--bg-secondary)' : undefined,
                  color: isProcessing ? 'var(--text-tertiary)' : undefined,
                  opacity: isProcessing ? 0.7 : 1,
                  cursor: isProcessing ? 'wait' : 'pointer'
                }}
                disabled={isProcessing}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                if (!selectedFaultTreeId) return;

                setIsProcessing(true);
                const originalTreeId = selectedFaultTreeId;
                
                try {
                  convertToSubtree(selectedFaultTreeId, gate.id);
                  setLastConversion({ from: originalTreeId, to: 'new' });
                  setTimeout(() => setIsProcessing(false), 800);
                } catch (err) {
                  console.error('Conversion error:', err);
                  setIsProcessing(false);
                }
                }}
              >
                {isProcessing ? (locale === 'ja' ? '処理中...' : 'Processing...') : (locale === 'ja' ? 'サブツリーとして分離' : 'Convert to Sub-tree')}
              </button>
              {lastConversion && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '8px', 
                  background: 'var(--accent-blue)15', 
                  border: '1px solid var(--accent-blue)30',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  color: 'var(--accent-blue)'
                }}>
                  <div>✅ {locale === 'ja' ? '新しい系統ツリーへ移動しました' : 'Moved to new sub-tree'}</div>
                  <button 
                    className="btn btn--link btn--sm" 
                    style={{ marginTop: '4px', padding: 0, fontSize: '11px' }}
                    onClick={() => {
                      selectFaultTree(lastConversion.from);
                      setLastConversion(null);
                    }}
                  >
                    {locale === 'ja' ? '元のツリーに戻る' : 'Go back to original tree'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '4px 0' }}>
              {locale === 'ja' ? 'このゲートは他系統へリンクされています' : 'This gate links to another system'}
            </div>
          )}
        </div>

        <div className="property-panel__section">
          <div className="property-panel__section-title">
            {locale === 'ja' ? '子ノード' : 'Children'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {gate.children.length} {locale === 'ja' ? '個の入力' : 'inputs'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="property-panel">
      <div className="empty-state" style={{ height: '100%' }}>
        <div className="empty-state__icon">📋</div>
        <div className="empty-state__title">
          {locale === 'ja' ? '未対応のノードタイプ' : 'Unsupported node type'}
        </div>
      </div>
    </div>
  );
}
