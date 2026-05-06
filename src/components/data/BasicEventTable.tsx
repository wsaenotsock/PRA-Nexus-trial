'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useModelStore } from '@/store/modelStore';
import type { BasicEvent } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

function EditableNameCell({ be, allEvents, onUpdate, locale }: { be: BasicEvent, allEvents: BasicEvent[], onUpdate: (name: string) => void, locale: 'ja' | 'en' }) {
  const [val, setVal] = useState(be.name);
  const isDuplicate = allEvents.some(e => e.id !== be.id && e.name === val);

  useEffect(() => {
    setVal(be.name);
  }, [be.name]);

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="form-input"
        style={{ 
          padding: '4px 8px', 
          fontSize: '11px', 
          background: 'transparent',
          borderColor: isDuplicate ? 'var(--accent-red)' : 'transparent',
          color: isDuplicate ? 'var(--accent-red)' : 'inherit'
        }}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => {
          if (!isDuplicate && val.trim() !== '') {
            onUpdate(val);
          } else {
            setVal(be.name); // Reset if invalid
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      {isDuplicate && (
        <div style={{ position: 'absolute', top: '100%', left: 0, fontSize: '9px', color: 'var(--accent-red)', zIndex: 10, background: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--accent-red)' }}>
          {locale === 'ja' ? '名前が重複しています' : 'Duplicate name'}
        </div>
      )}
    </div>
  );
}

export default function BasicEventTable({ locale = 'ja', highlightedId }: { locale?: 'ja' | 'en'; highlightedId?: string | null }) {
  const model = useModelStore((s) => s.model);
  const updateBasicEvent = useModelStore((s) => s.updateBasicEvent);
  const addBasicEvent = useModelStore((s) => s.addBasicEvent);
  const [searchTerm, setSearchTerm] = useState('');
  const highlightRef = useRef<HTMLTableRowElement>(null);

  const handleAdd = () => {
    const newId = uuidv4();
    const newEvent: BasicEvent = {
      id: newId,
      name: locale === 'ja' ? '新規基事象' : 'New Basic Event',
      tags: [],
      failureType: 'time',
      failureRate: 1e-4,
      probability: 1e-4,
      missionTime: 24,
      demands: 1,
      distribution: { type: 'lognormal', errorFactor: 3 },
      source: '',
      memo: '',
    };
    addBasicEvent(newEvent);
  };

  const handleDelete = (id: string) => {
    if (confirm(locale === 'ja' ? 'この基事象を削除しますか？' : 'Delete this basic event?')) {
      useModelStore.setState((state) => ({
        ...state,
        model: {
          ...state.model,
          basicEvents: state.model.basicEvents.filter((be) => be.id !== id)
        },
        isDirty: true
      }));
    }
  };

  const filteredEvents = model.basicEvents.filter((be) => 
    be.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    be.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (be.eventId && be.eventId.toLowerCase().includes(searchTerm.toLowerCase())) ||
    be.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Auto-scroll to highlighted entity
  useEffect(() => {
    if (highlightedId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedId]);

  return (
    <div style={{ padding: 'var(--space-lg)', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>
          {locale === 'ja' ? '基事象データベース' : 'Basic Event Database'}
          <span className="badge badge--success" style={{ marginLeft: '12px' }}>
            {model.basicEvents.length}
          </span>
        </h2>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder={locale === 'ja' ? '検索...' : 'Search...'} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '250px' }}
          />
          <button className="btn btn--primary" onClick={handleAdd}>
            + {locale === 'ja' ? '新規作成' : 'Add New'}
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
        <table className="results-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{locale === 'ja' ? '基事象ID' : 'Event ID'}</th>
              <th>{locale === 'ja' ? '名前' : 'Name'}</th>
              <th>{locale === 'ja' ? 'タグ' : 'Tags'}</th>
              <th>{locale === 'ja' ? '参照パラメータ' : 'Parameter'}</th>
              <th>{locale === 'ja' ? 'タイプ' : 'Type'}</th>
              <th>{locale === 'ja' ? '故障率 (1/hr or 1/d)' : 'Failure Rate'}</th>
              <th>{locale === 'ja' ? '時間/デマンド数' : 'Time/Demands'}</th>
              <th>{locale === 'ja' ? '確率' : 'Probability'}</th>
              <th>{locale === 'ja' ? '分布' : 'Dist.'}</th>
              <th>{locale === 'ja' ? '不確かさ' : 'Uncertainty'}</th>
              <th>{locale === 'ja' ? '操作' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((be) => (
              <tr
                key={be.id}
                ref={be.id === highlightedId ? highlightRef : undefined}
                style={{
                  ...(be.id === highlightedId ? {
                    animation: 'highlightPulse 1.5s ease-in-out 2',
                    outline: '2px solid var(--accent-primary)',
                    outlineOffset: '-2px',
                    borderRadius: 4,
                  } : {}),
                }}
              >
                <td style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{be.id.slice(0, 8)}</td>
                <td>
                  <input
                    className="form-input form-input--mono"
                    style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent', width: '110px' }}
                    value={be.eventId || ''}
                    placeholder={locale === 'ja' ? '例: BE-01' : 'e.g. BE-01'}
                    onChange={(e) => updateBasicEvent({ ...be, eventId: e.target.value })}
                  />
                </td>
                <td>
                  <EditableNameCell 
                    be={be} 
                    allEvents={model.basicEvents} 
                    onUpdate={(newName) => updateBasicEvent({ ...be, name: newName })} 
                    locale={locale}
                  />
                </td>
                <td>
                  <input
                    className="form-input"
                    style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent' }}
                    value={be.tags.join(', ')}
                    placeholder="tag1, tag2"
                    onChange={(e) => updateBasicEvent({ ...be, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                  />
                </td>
                <td>
                  <select
                    className="form-select"
                    style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent', maxWidth: '120px' }}
                    value={be.parameterId || ''}
                    onChange={(e) => {
                      const pid = e.target.value;
                      if (!pid) {
                        updateBasicEvent({ ...be, parameterId: undefined });
                      } else {
                        const param = (model.parameters || []).find(p => p.id === pid);
                        if (param) {
                          updateBasicEvent({ 
                            ...be, 
                            parameterId: pid, 
                            failureType: param.failureType, 
                            failureRate: param.value,
                            probability: param.failureType === 'demand' 
                              ? param.value * (be.demands ?? 1) 
                              : param.value * (be.missionTime ?? 24)
                          });
                        }
                      }
                    }}
                  >
                    <option value="">{locale === 'ja' ? 'なし (個別)' : 'None'}</option>
                    {(model.parameters || []).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="form-select"
                    style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent' }}
                    value={be.failureType || 'time'}
                    disabled={!!be.parameterId}
                    onChange={(e) => {
                      const newType = e.target.value as 'time' | 'demand';
                      updateBasicEvent({
                        ...be,
                        failureType: newType,
                        probability: newType === 'demand'
                          ? be.failureRate * (be.demands ?? 1)
                          : be.failureRate * (be.missionTime ?? 24)
                      });
                    }}
                  >
                    <option value="time">{locale === 'ja' ? '時間' : 'Time'}</option>
                    <option value="demand">{locale === 'ja' ? 'デマンド' : 'Demand'}</option>
                  </select>
                </td>
                <td>
                  <input
                    className="form-input form-input--mono"
                    type="number"
                    step="any"
                    disabled={!!be.parameterId}
                    style={{ width: '100px', padding: '4px 8px', fontSize: '11px', background: 'transparent' }}
                    value={be.failureRate}
                    onChange={(e) => {
                      const newRate = parseFloat(e.target.value) || 0;
                      updateBasicEvent({ 
                        ...be, 
                        failureRate: newRate,
                        probability: be.failureType === 'demand'
                          ? newRate * (be.demands ?? 1)
                          : newRate * (be.missionTime ?? 24)
                      });
                    }}
                  />
                  <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginLeft: '4px' }}>
                    {be.failureType === 'demand' ? '/d' : '/hr'}
                  </span>
                </td>
                <td>
                  <input
                    className="form-input form-input--mono"
                    type="number"
                    step="any"
                    style={{ width: '80px', padding: '4px 8px', fontSize: '11px', background: 'transparent' }}
                    value={be.failureType === 'demand' ? (be.demands ?? 1) : (be.missionTime ?? 24)}
                    onChange={(e) => {
                      const newVal = parseFloat(e.target.value) || (be.failureType === 'demand' ? 1 : 24);
                      if (be.failureType === 'demand') {
                        updateBasicEvent({ 
                          ...be, 
                          demands: newVal,
                          probability: be.failureRate * newVal
                        });
                      } else {
                        updateBasicEvent({ 
                          ...be, 
                          missionTime: newVal,
                          probability: be.failureRate * newVal
                        });
                      }
                    }}
                  />
                </td>
                <td className="td-mono">
                  {be.probability !== undefined ? Number(be.probability).toExponential(2) : '-'}
                </td>
                <td>
                  <select 
                    className="form-control form-control--sm"
                    style={{ fontSize: '11px', height: '24px', padding: '2px 4px' }}
                    value={be.distribution?.type || 'point'}
                    onChange={(e) => updateBasicEvent({ ...be, distribution: { ...(be.distribution || { type: 'point' }), type: e.target.value as any }})}
                  >
                    <option value="point">{locale === 'ja' ? '点推定' : 'Point'}</option>
                    <option value="lognormal">Lognormal</option>
                    <option value="normal">Normal</option>
                    <option value="uniform">Uniform</option>
                    <option value="beta">Beta</option>
                    <option value="gamma">Gamma</option>
                    <option value="weibull">Weibull</option>
                  </select>
                </td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', minWidth: '140px' }}>
                    {be.distribution?.type === 'lognormal' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>EF:</span>
                        <input 
                          type="number" className="form-control form-control--sm td-mono" style={{ width: '40px', height: '22px', fontSize: '10px' }}
                          value={be.distribution.errorFactor || 3}
                          onChange={(e) => updateBasicEvent({ ...be, distribution: { ...be.distribution, errorFactor: parseFloat(e.target.value) }})}
                        />
                      </div>
                    )}
                    {be.distribution?.type === 'normal' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>SD:</span>
                        <input 
                          type="number" className="form-control form-control--sm td-mono" style={{ width: '50px', height: '22px', fontSize: '10px' }}
                          value={be.distribution.stdDev || 0}
                          onChange={(e) => updateBasicEvent({ ...be, distribution: { ...be.distribution, stdDev: parseFloat(e.target.value) }})}
                        />
                      </div>
                    )}
                    {be.distribution?.type === 'uniform' && (
                      <>
                        <input 
                          type="number" className="form-control form-control--sm td-mono" style={{ width: '45px', height: '22px', fontSize: '10px' }}
                          placeholder="Min"
                          value={be.distribution.lower || 0}
                          onChange={(e) => updateBasicEvent({ ...be, distribution: { ...be.distribution, lower: parseFloat(e.target.value) }})}
                        />
                        <input 
                          type="number" className="form-control form-control--sm td-mono" style={{ width: '45px', height: '22px', fontSize: '10px' }}
                          placeholder="Max"
                          value={be.distribution.upper || 0}
                          onChange={(e) => updateBasicEvent({ ...be, distribution: { ...be.distribution, upper: parseFloat(e.target.value) }})}
                        />
                      </>
                    )}
                    {(be.distribution?.type === 'gamma' || be.distribution?.type === 'weibull') && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>k:</span>
                          <input 
                            type="number" className="form-control form-control--sm td-mono" style={{ width: '40px', height: '22px', fontSize: '10px' }}
                            value={be.distribution.shape || 1.5}
                            onChange={(e) => updateBasicEvent({ ...be, distribution: { ...be.distribution, shape: parseFloat(e.target.value) }})}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>θ:</span>
                          <input 
                            type="number" className="form-control form-control--sm td-mono" style={{ width: '45px', height: '22px', fontSize: '10px' }}
                            value={be.distribution.scale || 0}
                            onChange={(e) => updateBasicEvent({ ...be, distribution: { ...be.distribution, scale: parseFloat(e.target.value) }})}
                          />
                        </div>
                      </>
                    )}
                    {be.distribution?.type === 'beta' && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>α:</span>
                          <input 
                            type="number" className="form-control form-control--sm td-mono" style={{ width: '40px', height: '22px', fontSize: '10px' }}
                            value={be.distribution.alpha || 2}
                            onChange={(e) => updateBasicEvent({ ...be, distribution: { ...be.distribution, alpha: parseFloat(e.target.value) }})}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>β:</span>
                          <input 
                            type="number" className="form-control form-control--sm td-mono" style={{ width: '40px', height: '22px', fontSize: '10px' }}
                            value={be.distribution.beta || 10}
                            onChange={(e) => updateBasicEvent({ ...be, distribution: { ...be.distribution, beta: parseFloat(e.target.value) }})}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </td>
                <td>
                  <button 
                    className="btn btn--ghost btn--sm" 
                    onClick={() => handleDelete(be.id)}
                    style={{ color: 'var(--accent-red)' }}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
            {filteredEvents.length === 0 && (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-tertiary)' }}>
                  {locale === 'ja' ? 'データがありません' : 'No data available'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
