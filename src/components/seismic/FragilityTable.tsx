'use client';

import React, { useState, useMemo } from 'react';
import { useModelStore } from '@/store/modelStore';
import type { SeismicFragility, SeismicFragilityPoint } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { v4 as uuidv4 } from 'uuid';

interface FragilityTableProps {
  locale?: 'ja' | 'en';
}

// Log-normal CDF approximation (Normal distribution CDF)
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

export default function FragilityTable({ locale = 'ja' }: FragilityTableProps) {
  const fragilities = useModelStore((s) => s.model.seismicFragilities || []);
  const addFragility = useModelStore((s) => s.addSeismicFragility);
  const updateFragility = useModelStore((s) => s.updateSeismicFragility);
  const removeFragility = useModelStore((s) => s.removeSeismicFragility);

  const [selectedId, setSelectedId] = useState<string | null>(
    fragilities.length > 0 ? fragilities[0].id : null
  );

  const selected = fragilities.find(f => f.id === selectedId);

  const handleAdd = () => {
    const newFragility: SeismicFragility = {
      id: uuidv4(),
      name: locale === 'ja' ? '新機器フラジリティ' : 'New Component Fragility',
      type: 'lognormal',
      am: 1.0,
      betaR: 0.2,
      betaU: 0.2,
      points: []
    };
    addFragility(newFragility);
    setSelectedId(newFragility.id);
  };

  const handleAddPoint = () => {
    if (!selected) return;
    const newPoints = [...(selected.points || []), { pga: 0, probability: 0 }];
    updateFragility({ ...selected, points: newPoints });
  };

  const handleUpdatePoint = (index: number, updates: Partial<SeismicFragilityPoint>) => {
    if (!selected) return;
    const newPoints = (selected.points || []).map((p, i) => i === index ? { ...p, ...updates } : p);
    updateFragility({ ...selected, points: newPoints });
  };

  const handleRemovePoint = (index: number) => {
    if (!selected) return;
    const newPoints = (selected.points || []).filter((_, i) => i !== index);
    updateFragility({ ...selected, points: newPoints });
  };

  // Calculate curve data for preview
  const curveData = useMemo(() => {
    if (!selected) return [];
    
    if (selected.type === 'discrete' && selected.points && selected.points.length > 0) {
      return [...selected.points]
        .sort((a, b) => a.pga - b.pga)
        .map(p => ({ pga: p.pga, prob: p.probability }));
    }

    // Default to lognormal
    const data = [];
    const am = selected.am || 1.0;
    const betaR = selected.betaR || 0.2;
    const betaU = selected.betaU || 0.2;
    const betaC = Math.sqrt(betaR * betaR + betaU * betaU);
    
    const maxPGA = Math.max(am * 2.5, 2.0);
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
      const pga = (maxPGA / steps) * i;
      if (pga === 0) {
        data.push({ pga: 0, prob: 0 });
        continue;
      }
      const z = Math.log(pga / am) / betaC;
      data.push({ pga: parseFloat(pga.toFixed(3)), prob: normalCDF(z) });
    }
    return data;
  }, [selected]);

  return (
    <div className="fragility-editor-container" style={{ display: 'flex', height: '100%', minHeight: '600px', gap: '20px' }}>
      {/* Sidebar */}
      <div className="fragility-sidebar" style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '12px', borderRight: '1px solid var(--border-default)', paddingRight: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{locale === 'ja' ? 'フラジリティ定義' : 'Fragility List'}</h4>
          <button className="btn btn--secondary btn--sm" onClick={handleAdd}>+</button>
        </div>
        <div className="fragility-list" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {fragilities.map((f) => (
            <div 
              key={f.id} 
              onClick={() => setSelectedId(f.id)}
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                background: selectedId === f.id ? 'var(--accent-amber)' : 'var(--bg-secondary)',
                color: selectedId === f.id ? 'white' : 'var(--text-primary)',
                transition: 'all 0.2s',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px', flex: 1 }}>{f.name}</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0, fontSize: '10px' }}>
                {f.type === 'discrete' ? (
                  <span style={{ opacity: 0.7 }}>Discrete</span>
                ) : (
                  <>
                    <span style={{ 
                      color: selectedId === f.id ? 'white' : '#3b82f6', 
                      fontWeight: 600,
                      opacity: selectedId === f.id ? 0.9 : 1
                    }}>
                      HCLPF={(f.am * Math.exp(-1.645 * ((f.betaR || 0) + (f.betaU || 0)))).toFixed(2)}
                    </span>
                    <span style={{ opacity: 0.6 }}>Am={f.am}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="fragility-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {selected ? (
          <>
            <div className="fragility-header" style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-canvas)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>{locale === 'ja' ? '名称' : 'Name'}</label>
                <input
                  className="form-input"
                  value={selected.name}
                  onChange={(e) => updateFragility({ ...selected, name: e.target.value })}
                  style={{ fontSize: '16px', fontWeight: 600, background: 'transparent', border: 'none', padding: 0 }}
                />
              </div>
              <div className="tabs" style={{ background: 'var(--bg-secondary)', padding: '2px', borderRadius: '6px', marginBottom: 0 }}>
                <button 
                  className={`tab tab--sm ${(!selected.type || selected.type === 'lognormal') ? 'tab--active' : ''}`}
                  onClick={() => updateFragility({ ...selected, type: 'lognormal' })}
                >
                  {locale === 'ja' ? '対数正規' : 'Lognormal'}
                </button>
                <button 
                  className={`tab tab--sm ${selected.type === 'discrete' ? 'tab--active' : ''}`}
                  onClick={() => updateFragility({ ...selected, type: 'discrete' })}
                >
                  {locale === 'ja' ? '離散データ' : 'Discrete'}
                </button>
              </div>
              <button className="btn btn--ghost btn--sm" style={{ color: 'var(--accent-red)' }} onClick={() => {
                if (confirm(locale === 'ja' ? '削除しますか？' : 'Delete?')) {
                  removeFragility(selected.id);
                  setSelectedId(fragilities[0]?.id || null);
                }
              }}>
                {locale === 'ja' ? '削除' : 'Delete'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
              {/* Left Column: Editor */}
              <div style={{ width: '360px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                
                {(!selected.type || selected.type === 'lognormal') ? (
                  <>
                    <h5 style={{ margin: 0, fontSize: '12px' }}>{locale === 'ja' ? 'パラメータ設定' : 'Parameters'}</h5>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px' }}>中央値 Am (g)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={selected.am}
                        step="0.1"
                        onChange={(e) => updateFragility({ ...selected, am: parseFloat(e.target.value) || 0 })}
                      />
                      <small style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>中央故障加速度</small>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px' }}>βr (Randomness)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={selected.betaR}
                        step="0.01"
                        onChange={(e) => updateFragility({ ...selected, betaR: parseFloat(e.target.value) || 0 })}
                      />
                      <small style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>固有のバラツキ</small>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px' }}>βu (Uncertainty)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={selected.betaU}
                        step="0.01"
                        onChange={(e) => updateFragility({ ...selected, betaU: parseFloat(e.target.value) || 0 })}
                      />
                      <small style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>不確実さ</small>
                    </div>
                    <div style={{ marginTop: 'auto', padding: '12px', background: 'var(--bg-canvas)', borderRadius: '6px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '10px' }}>Composite βc:</div>
                        <div style={{ fontSize: '14px', color: 'var(--accent-amber)', fontWeight: 'bold' }}>
                          {Math.sqrt((selected.betaR || 0)**2 + (selected.betaU || 0)**2).toFixed(3)}
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '10px' }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '10px', color: 'var(--text-primary)' }}>HCLPF 容量 (g):</div>
                        <div style={{ fontSize: '18px', color: '#3b82f6', fontWeight: 'bold' }}>
                          {(selected.am * Math.exp(-1.645 * ((selected.betaR || 0) + (selected.betaU || 0)))).toFixed(3)}
                        </div>
                        <small style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                          {locale === 'ja' ? '95%信頼度での5%破損確率値' : 'High Confidence Low Probability of Failure'}
                        </small>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h5 style={{ margin: 0, fontSize: '12px' }}>{locale === 'ja' ? '離散データポイント' : 'Discrete Points'}</h5>
                      <button className="btn btn--ghost btn--sm" onClick={handleAddPoint}>+</button>
                    </div>
                    <div className="table-wrapper" style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: '6px', background: 'var(--bg-canvas)' }}>
                      <table className="data-table" style={{ border: 'none', fontSize: '11px', width: '100%' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                          <tr>
                            <th style={{ width: 'auto', minWidth: '80px' }}>PGA(g)</th>
                            <th style={{ width: 'auto' }}>Prob</th>
                            <th style={{ width: '35px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selected.points || []).map((p, i) => (
                            <tr key={i}>
                              <td style={{ width: 'auto' }}>
                                <input
                                  type="number"
                                  className="form-input form-input--sm form-input--mono"
                                  style={{ 
                                    minWidth: '80px',
                                    maxWidth: '180px',
                                    // Dynamically estimate width based on character count
                                    // ch unit is approximately the width of '0'
                                    // Increased padding (+5) to account for number input arrows and padding
                                    width: `${Math.max(10, String(p.pga).length + 5)}ch` 
                                  }}
                                  value={p.pga}
                                  step="0.01"
                                  onChange={(e) => handleUpdatePoint(i, { pga: parseFloat(e.target.value) || 0 })}
                                />
                              </td>
                              <td style={{ width: '100%' }}>
                                <input
                                  type="number"
                                  className="form-input form-input--sm form-input--mono"
                                  style={{ width: '100%', minWidth: '100px' }}
                                  value={p.probability}
                                  step="0.01"
                                  min="0"
                                  max="1"
                                  onChange={(e) => handleUpdatePoint(i, { probability: parseFloat(e.target.value) || 0 })}
                                />
                              </td>
                              <td>
                                <button className="btn btn--ghost btn--sm" onClick={() => handleRemovePoint(i)}>×</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* Visualization Panel */}
              <div style={{ flex: 1, background: 'var(--bg-canvas)', borderRadius: '8px', border: '1px solid var(--border-default)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <h5 style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {locale === 'ja' ? 'フラジリティ曲線プレビュー (CDF)' : 'Fragility Curve Preview (CDF)'}
                </h5>
                <div style={{ flex: 1, minHeight: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={curveData} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" opacity={0.3} />
                      <XAxis 
                        dataKey="pga" 
                        type="number" 
                        domain={[0, 'auto']}
                        label={{ value: 'PGA (g)', position: 'insideBottom', offset: -10, fontSize: 11, fill: 'var(--text-tertiary)' }}
                        tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                        stroke="var(--border-default)"
                      />
                      <YAxis 
                        domain={[0, 1]}
                        label={{ value: locale === 'ja' ? '故障確率' : 'Failure Prob', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--text-tertiary)' }}
                        tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                        stroke="var(--border-default)"
                      />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)', fontSize: '12px' }}
                        formatter={(value: any) => [value.toFixed(4), 'Prob']}
                        labelFormatter={(value: any) => `PGA: ${value}g`}
                      />
                      {selected.type !== 'discrete' && (
                        <>
                          <ReferenceLine x={selected.am} stroke="var(--accent-amber)" strokeDasharray="3 3" label={{ position: 'top', value: 'Am', fill: 'var(--accent-amber)', fontSize: 10 }} />
                          <ReferenceLine 
                            x={selected.am * Math.exp(-1.645 * ((selected.betaR || 0) + (selected.betaU || 0)))} 
                            stroke="#3b82f6" 
                            strokeDasharray="3 3" 
                            label={{ position: 'top', value: 'HCLPF', fill: '#3b82f6', fontSize: 10 }} 
                          />
                        </>
                      )}
                      <Line 
                        type="monotone" 
                        dataKey="prob" 
                        stroke="var(--accent-amber)" 
                        strokeWidth={3} 
                        dot={selected.type === 'discrete'}
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '10px', textAlign: 'center', lineHeight: 1.5 }}>
                  {selected.type === 'discrete' 
                    ? (locale === 'ja' ? '入力されたデータポイント間を線形補間して故障確率を算出します。' : 'Calculates failure probability by linearly interpolating between discrete data points.')
                    : (locale === 'ja' 
                      ? '対数正規分布に基づき、指定された中央値 Am と複合対数標準偏差 βc から故障確率を算出しています。' 
                      : 'Calculates failure probability based on log-normal distribution with median Am and composite beta.')
                  }
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', borderRadius: '12px', border: '2px dashed var(--border-default)', opacity: 0.6 }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚙️</div>
            <div style={{ fontSize: '14px' }}>{locale === 'ja' ? 'フラジリティ定義を選択するか新規作成してください' : 'Select or create a fragility definition'}</div>
          </div>
        )}
      </div>
    </div>
  );
}
