import React, { useState, useEffect } from 'react';
import { useModelStore } from '@/store/modelStore';

interface ETPropertyPanelProps {
  selectedNodeId: string | null;
  selectedNodeType: string | null;
  locale: 'ja' | 'en';
}

export default function ETPropertyPanel({ selectedNodeId, selectedNodeType, locale }: ETPropertyPanelProps) {
  const model = useModelStore((s) => s.model);
  const selectedEventTreeId = useModelStore((s) => s.selectedEventTreeId);
  const updateFunctionalEvent = useModelStore((s) => s.updateFunctionalEvent);
  const updateSequence = useModelStore((s) => s.updateSequence);
  const updateInitiatingEvent = useModelStore((s) => s.updateInitiatingEvent);
  
  const [localName, setLocalName] = useState('');
  const [localCode, setLocalCode] = useState('');
  const [localBranches, setLocalBranches] = useState<{ id: string; label: string; description?: string; probability?: number }[]>([]);
  const [localLinkedFaultTreeId, setLocalLinkedFaultTreeId] = useState('');
  const [localEndStateId, setLocalEndStateId] = useState('');
  const [localTransferETId, setLocalTransferETId] = useState('');
  const [localIELabel, setLocalIELabel] = useState('');
  const [localIEFreq, setLocalIEFreq] = useState('');

  const currentET = model.eventTrees?.find(et => et.id === selectedEventTreeId);

  useEffect(() => {
    if (!currentET || !selectedNodeId) return;

    if (selectedNodeType === 'functionalEvent') {
      const fe = currentET.functionalEvents.find(f => f.id === selectedNodeId);
      if (fe) {
        setLocalName(fe.name);
        setLocalCode(fe.code || '');
        setLocalBranches(fe.branches || []);
        setLocalLinkedFaultTreeId(fe.linkedFaultTreeId || '');
      }
    } else if (selectedNodeType === 'sequence') {
      const seq = currentET.sequences.find(s => s.id === selectedNodeId);
      if (seq) {
        setLocalEndStateId(seq.endStateId || '');
        setLocalTransferETId(seq.transferETId || '');
      }
    } else if (selectedNodeType === 'initiatingEvent') {
      const ie = model.initiatingEvents?.find(i => i.id === selectedNodeId);
      if (ie) {
        setLocalIELabel(ie.name);
        setLocalCode(ie.code || '');
        setLocalIEFreq(ie.frequency.toString());
        setLocalLinkedFaultTreeId(ie.linkedFaultTreeId || '');
      }
    }
  }, [selectedNodeId, selectedNodeType, currentET]);

  if (!selectedNodeId || !currentET) {
    return (
      <div className="property-panel">
        <div className="empty-state" style={{ height: '100%' }}>
          <div className="empty-state__icon">📋</div>
          <div className="empty-state__title">
            {locale === 'ja' ? 'プロパティ' : 'Properties'}
          </div>
          <div className="empty-state__description">
            {locale === 'ja' ? '項目を選択してください' : 'Select an item'}
          </div>
        </div>
      </div>
    );
  }

  const handleUpdateFE = () => {
    if (selectedNodeType === 'functionalEvent' && selectedEventTreeId) {
      updateFunctionalEvent(selectedEventTreeId, selectedNodeId, {
        name: localName,
        code: localCode,
        branches: localBranches,
        linkedFaultTreeId: localLinkedFaultTreeId
      });
    }
  };

  const handleAddBranch = () => {
    const newBranches = [...localBranches, { id: crypto.randomUUID(), label: `Branch ${localBranches.length + 1}` }];
    setLocalBranches(newBranches);
    if (selectedNodeType === 'functionalEvent' && selectedEventTreeId && selectedNodeId) {
      updateFunctionalEvent(selectedEventTreeId, selectedNodeId, { branches: newBranches });
    }
  };

  const handleUpdateBranchLabel = (index: number, label: string) => {
    const newBranches = [...localBranches];
    newBranches[index].label = label;
    setLocalBranches(newBranches);
  };

  const handleUpdateBranchDescription = (index: number, description: string) => {
    const newBranches = [...localBranches];
    newBranches[index].description = description;
    setLocalBranches(newBranches);
  };

  const handleUpdateBranchProb = (index: number, prob: string) => {
    const newBranches = [...localBranches];
    const val = parseFloat(prob);
    newBranches[index].probability = isNaN(val) ? undefined : val;
    setLocalBranches(newBranches);
  };

  const handleRemoveBranch = (index: number) => {
    const newBranches = [...localBranches];
    newBranches.splice(index, 1);
    setLocalBranches(newBranches);
    if (selectedNodeType === 'functionalEvent' && selectedEventTreeId && selectedNodeId) {
      updateFunctionalEvent(selectedEventTreeId, selectedNodeId, { branches: newBranches });
    }
  };

  const handleUpdateSequence = (endStateId: string) => {
    setLocalEndStateId(endStateId);
    if (selectedEventTreeId) {
      updateSequence(selectedEventTreeId, selectedNodeId, { endStateId });
    }
  };

  const handleUpdateTransfer = (transferETId: string) => {
    setLocalTransferETId(transferETId);
    if (selectedEventTreeId) {
      updateSequence(selectedEventTreeId, selectedNodeId, { transferETId: transferETId || undefined });
    }
  };

  const handleUpdateIE = () => {
    if (selectedNodeType === 'initiatingEvent') {
      updateInitiatingEvent(selectedNodeId, {
        name: localIELabel,
        code: localCode,
        frequency: parseFloat(localIEFreq) || 0,
        linkedFaultTreeId: localLinkedFaultTreeId
      });
    }
  };

  return (
    <div className="property-panel animate-slideIn">
      <div className="property-panel__header">
        <span className="property-panel__title">
          {selectedNodeType === 'functionalEvent' ? (locale === 'ja' ? '機能事象 プロパティ' : 'Functional Event Properties') : 
           selectedNodeType === 'sequence' ? (locale === 'ja' ? 'シーケンス プロパティ' : 'Sequence Properties') :
           (locale === 'ja' ? '起因事象 プロパティ' : 'Initiating Event Properties')}
        </span>
        <span className="badge badge--success">
          {selectedNodeType === 'functionalEvent' ? 'FE' : selectedNodeType === 'sequence' ? 'SEQ' : 'IE'}
        </span>
      </div>
      
      <div className="property-panel__section">
        {selectedNodeType === 'functionalEvent' && (
          <>
            <div className="form-group">
              <label className="form-label">{locale === 'ja' ? 'ID (英字等)' : 'ID (Code)'}</label>
              <input
                className="form-input td-mono"
                value={localCode}
                onChange={(e) => setLocalCode(e.target.value)}
                onBlur={handleUpdateFE}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateFE()}
                placeholder="e.g. RPS"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">{locale === 'ja' ? '名称' : 'Name'}</label>
              <input
                className="form-input"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onBlur={handleUpdateFE}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateFE()}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">{locale === 'ja' ? '関連付けられたFault Tree' : 'Linked Fault Tree'}</label>
              <select
                className="form-select"
                value={localLinkedFaultTreeId}
                onChange={(e) => {
                  setLocalLinkedFaultTreeId(e.target.value);
                  if (selectedEventTreeId && selectedNodeId) {
                    updateFunctionalEvent(selectedEventTreeId, selectedNodeId, { linkedFaultTreeId: e.target.value });
                  }
                }}
              >
                <option value="">{locale === 'ja' ? '未選択 (手入力確率を使用)' : 'None (Use manual probability)'}</option>
                {model.faultTrees?.map(ft => (
                  <option key={ft.id} value={ft.id}>{ft.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>{locale === 'ja' ? '分岐リスト' : 'Branches'}</label>
                <button className="btn btn--ghost btn--sm" onClick={handleAddBranch} title={locale === 'ja' ? '追加' : 'Add'}>+</button>
              </div>
              
              {localBranches.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {locale === 'ja' ? '分岐が定義されていません（2分岐推奨）' : 'No branches defined (2 recommended)'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {localBranches.map((b, i) => (
                    <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '30px', fontWeight: 'bold' }}>
                          {i === 0 ? '↑ (S)' : i === 1 ? '↓ (F)' : `#${i+1}`}
                        </span>
                        <input
                          className="form-input"
                          value={b.label}
                          onChange={(e) => handleUpdateBranchLabel(i, e.target.value)}
                          onBlur={handleUpdateFE}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateFE()}
                          style={{ flex: 1, height: '24px', fontSize: '12px' }}
                          placeholder={i === 0 ? (locale === 'ja' ? '成功/Success' : 'Success') : (locale === 'ja' ? '失敗/Failure' : 'Failure')}
                        />
                        <button className="btn btn--ghost btn--sm" onClick={() => handleRemoveBranch(i)} style={{ color: 'var(--accent-red)', padding: '0 4px' }}>×</button>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                          className="form-input"
                          value={b.description || ''}
                          onChange={(e) => handleUpdateBranchDescription(i, e.target.value)}
                          onBlur={handleUpdateFE}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateFE()}
                          style={{ flex: 1, height: '24px', fontSize: '11px', color: 'var(--text-muted)' }}
                          placeholder={locale === 'ja' ? 'パス説明 (例: 成功)...' : 'Path description...'}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '30px' }}>{locale === 'ja' ? '確率' : 'Prob'}</span>
                        <input
                          className="form-input"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={b.probability ?? ''}
                          onChange={(e) => handleUpdateBranchProb(i, e.target.value)}
                          onBlur={handleUpdateFE}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateFE()}
                          style={{ flex: 1, height: '24px', fontSize: '12px' }}
                          disabled={!!localLinkedFaultTreeId}
                          placeholder={localLinkedFaultTreeId ? (locale === 'ja' ? 'FTから計算' : 'From FT') : '0.0'}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
              {locale === 'ja' ? '※ 分岐数を変更すると、このヘッダーを使用している既存のシーケンスに影響が出る場合があります。' : '* Changing branch count may affect existing sequences using this header.'}
            </div>
          </>
        )}

        {selectedNodeType === 'sequence' && (
          <>
            <div className="form-group">
              <label className="form-label">{locale === 'ja' ? 'End State (結果)' : 'End State'}</label>
              <select
                className="form-select"
                value={localEndStateId}
                onChange={(e) => handleUpdateSequence(e.target.value)}
              >
                <option value="">{locale === 'ja' ? '未選択' : 'None'}</option>
                {model.endStates?.map(es => (
                  <option key={es.id} value={es.id}>{es.name} ({es.categories?.join(', ')})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{locale === 'ja' ? 'トランスファー先 (ET)' : 'Transfer to (ET)'}</label>
              <select
                className="form-select"
                value={localTransferETId}
                onChange={(e) => handleUpdateTransfer(e.target.value)}
              >
                <option value="">{locale === 'ja' ? 'なし (終了)' : 'None (Terminal)'}</option>
                {model.eventTrees?.filter(et => et.id !== selectedEventTreeId).map(et => (
                  <option key={et.id} value={et.id}>{et.name}</option>
                ))}
              </select>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {locale === 'ja' ? '別のETへ解析を継続する場合に選択します。' : 'Select to continue analysis in another tree.'}
              </p>
            </div>
          </>
        )}

        {selectedNodeType === 'initiatingEvent' && (
          <>
            <div className="form-group">
              <label className="form-label">{locale === 'ja' ? 'ID (英字等)' : 'ID (Code)'}</label>
              <input
                className="form-input td-mono"
                value={localCode}
                onChange={(e) => setLocalCode(e.target.value)}
                onBlur={handleUpdateIE}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateIE()}
                placeholder="e.g. LOCA"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{locale === 'ja' ? '起因事象名' : 'IE Name'}</label>
              <input
                className="form-input"
                value={localIELabel}
                onChange={(e) => setLocalIELabel(e.target.value)}
                onBlur={handleUpdateIE}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateIE()}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{locale === 'ja' ? '関連付けられたFault Tree' : 'Linked Fault Tree'}</label>
              <select
                className="form-select"
                value={localLinkedFaultTreeId}
                onChange={(e) => {
                  setLocalLinkedFaultTreeId(e.target.value);
                  if (selectedNodeId) {
                    updateInitiatingEvent(selectedNodeId, { linkedFaultTreeId: e.target.value });
                  }
                }}
              >
                <option value="">{locale === 'ja' ? '未選択 (手入力頻度を使用)' : 'None (Use manual frequency)'}</option>
                {model.faultTrees?.map(ft => (
                  <option key={ft.id} value={ft.id}>{ft.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{locale === 'ja' ? '発生頻度 [/yr]' : 'Frequency [/yr]'}</label>
              <input
                className="form-input"
                type="number"
                step="1e-6"
                value={localIEFreq}
                onChange={(e) => setLocalIEFreq(e.target.value)}
                onBlur={handleUpdateIE}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateIE()}
                disabled={!!localLinkedFaultTreeId}
                placeholder={localLinkedFaultTreeId ? (locale === 'ja' ? 'FTから計算' : 'From FT') : '0.0'}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
