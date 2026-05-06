'use client';

import React, { useState, useMemo } from 'react';
import { useModelStore } from '@/store/modelStore';
import type { SeismicHazardCurve, SeismicHazardPoint, SeismicHazardFractile } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { v4 as uuidv4 } from 'uuid';

interface HazardEditorProps {
  locale?: 'ja' | 'en';
}

export default function HazardEditor({ locale = 'ja' }: HazardEditorProps) {
  const hazards = useModelStore((s) => s.model.seismicHazards || []);
  const addSeismicHazard = useModelStore((s) => s.addSeismicHazard);
  const updateSeismicHazard = useModelStore((s) => s.updateSeismicHazard);
  const removeSeismicHazard = useModelStore((s) => s.removeSeismicHazard);

  const [selectedHazardId, setSelectedHazardId] = useState<string | null>(
    hazards.length > 0 ? hazards[0].id : null
  );

  const selectedHazard = hazards.find((h) => h.id === selectedHazardId);

  const [selectedFractileId, setSelectedFractileId] = useState<string | null>(
    selectedHazard && selectedHazard.fractiles.length > 0 ? selectedHazard.fractiles[0].id : null
  );

  // Sync selectedFractileId when hazard changes
  useMemo(() => {
    if (selectedHazard && (!selectedFractileId || !selectedHazard.fractiles.find(f => f.id === selectedFractileId))) {
      setSelectedFractileId(selectedHazard.fractiles[0]?.id || null);
    }
  }, [selectedHazard, selectedFractileId]);

  const selectedFractile = selectedHazard?.fractiles.find(f => f.id === selectedFractileId);

  const handleAddCurve = () => {
    const newCurve: SeismicHazardCurve = {
      id: uuidv4(),
      name: locale === 'ja' ? '新しいハザード曲線' : 'New Hazard Curve',
      fractiles: [
        {
          id: uuidv4(),
          name: 'Mean',
          percentile: -1,
          points: [
            { pga: 0.1, frequency: 1e-3 },
            { pga: 0.5, frequency: 1e-4 },
            { pga: 1.0, frequency: 1e-5 },
          ],
        }
      ],
    };
    addSeismicHazard(newCurve);
    setSelectedHazardId(newCurve.id);
    setSelectedFractileId(newCurve.fractiles[0].id);
  };

  const handleAddFractile = () => {
    if (!selectedHazard) return;
    const newFractile: SeismicHazardFractile = {
      id: uuidv4(),
      name: '50%',
      percentile: 0.5,
      points: selectedFractile ? [...selectedFractile.points] : [{ pga: 0.1, frequency: 1e-3 }],
    };
    updateSeismicHazard({
      ...selectedHazard,
      fractiles: [...selectedHazard.fractiles, newFractile]
    });
    setSelectedFractileId(newFractile.id);
  };

  const handleUpdateFractile = (fractileId: string, updates: Partial<SeismicHazardFractile>) => {
    if (!selectedHazard) return;
    updateSeismicHazard({
      ...selectedHazard,
      fractiles: selectedHazard.fractiles.map(f => f.id === fractileId ? { ...f, ...updates } : f)
    });
  };

  const handleRemoveFractile = (fractileId: string) => {
    if (!selectedHazard || selectedHazard.fractiles.length <= 1) return;
    const newFractiles = selectedHazard.fractiles.filter(f => f.id !== fractileId);
    updateSeismicHazard({ ...selectedHazard, fractiles: newFractiles });
    if (selectedFractileId === fractileId) {
      setSelectedFractileId(newFractiles[0].id);
    }
  };

  const handleAddPoint = () => {
    if (!selectedHazard || !selectedFractile) return;
    const newPoints = [...selectedFractile.points, { pga: 0, frequency: 0 }];
    handleUpdateFractile(selectedFractileId!, { points: newPoints });
  };

  const handleUpdatePoint = (index: number, updates: Partial<SeismicHazardPoint>) => {
    if (!selectedHazard || !selectedFractile) return;
    const newPoints = selectedFractile.points.map((p, i) => i === index ? { ...p, ...updates } : p);
    handleUpdateFractile(selectedFractileId!, { points: newPoints });
  };

  const handleRemovePoint = (index: number) => {
    if (!selectedHazard || !selectedFractile) return;
    const newPoints = selectedFractile.points.filter((_, i) => i !== index);
    handleUpdateFractile(selectedFractileId!, { points: newPoints });
  };

  const handleSortPoints = () => {
    if (!selectedHazard || !selectedFractile) return;
    const sortedPoints = [...selectedFractile.points].sort((a, b) => a.pga - b.pga);
    handleUpdateFractile(selectedFractileId!, { points: sortedPoints });
  };

  // Prepare chart data: Merge all fractile points into a common list of PGA values
  const chartData = useMemo(() => {
    if (!selectedHazard) return [];
    
    // Get all unique PGA values across all fractiles
    const allPGAs = new Set<number>();
    selectedHazard.fractiles.forEach(f => {
      f.points.forEach(p => {
        if (p.pga > 0 && p.frequency > 0) allPGAs.add(p.pga);
      });
    });

    const sortedPGAs = Array.from(allPGAs).sort((a, b) => a - b);

    // For each PGA, get the frequency for each fractile (interpolating if necessary)
    // For simplicity, we only show points that are explicitly defined
    // Alternatively, we can use a simpler approach: multiple Line components with different data
    return sortedPGAs;
  }, [selectedHazard]);

  // A better way to handle multiple lines in Recharts with potentially different X values:
  // Use a separate data array for each line, but Recharts doesn't handle this well in a single LineChart
  // if they don't share the same dataKey.
  // We can merge them by PGA.
  const mergedChartData = useMemo(() => {
    if (!selectedHazard) return [];
    const pgaMap = new Map<number, any>();
    
    selectedHazard.fractiles.forEach(f => {
      f.points.forEach(p => {
        if (p.pga <= 0 || p.frequency <= 0) return;
        if (!pgaMap.has(p.pga)) {
          pgaMap.set(p.pga, { pga: p.pga });
        }
        pgaMap.get(p.pga)[f.id] = p.frequency;
      });
    });

    return Array.from(pgaMap.values()).sort((a, b) => a.pga - b.pga);
  }, [selectedHazard]);

  const fractileColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="hazard-editor-container" style={{ display: 'flex', height: '100%', minHeight: '600px', gap: '20px' }}>
      {/* Sidebar: List of Curves */}
      <div className="hazard-sidebar" style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '12px', borderRight: '1px solid var(--border-default)', paddingRight: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{locale === 'ja' ? '曲線リスト' : 'Curve List'}</h4>
          <button className="btn btn--secondary btn--sm" onClick={handleAddCurve}>+</button>
        </div>
        <div className="curve-list" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {hazards.map((h) => (
            <div 
              key={h.id} 
              onClick={() => setSelectedHazardId(h.id)}
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                background: selectedHazardId === h.id ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                color: selectedHazardId === h.id ? 'white' : 'var(--text-primary)',
                transition: 'all 0.2s',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
              {selectedHazardId === h.id && <span style={{ fontSize: '10px' }}>●</span>}
            </div>
          ))}
          {hazards.length === 0 && (
            <div style={{ textAlign: 'center', opacity: 0.5, padding: '20px', fontSize: '12px' }}>
              {locale === 'ja' ? '曲線がありません' : 'No curves'}
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Editor & Graph */}
      <div className="hazard-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {selectedHazard ? (
          <>
            {/* Header: Name and Actions */}
            <div className="hazard-header" style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-canvas)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>{locale === 'ja' ? 'ハザード曲線名' : 'Curve Name'}</label>
                <input
                  className="form-input"
                  value={selectedHazard.name}
                  onChange={(e) => updateSeismicHazard({ ...selectedHazard, name: e.target.value })}
                  style={{ fontSize: '16px', fontWeight: 600, background: 'transparent', border: 'none', padding: 0 }}
                />
              </div>
              <button 
                className="btn btn--ghost btn--sm" 
                style={{ color: 'var(--accent-red)' }}
                onClick={() => {
                  if (confirm(locale === 'ja' ? '削除しますか？' : 'Delete?')) {
                    removeSeismicHazard(selectedHazard.id);
                    setSelectedHazardId(hazards[0]?.id || null);
                  }
                }}
              >
                {locale === 'ja' ? '削除' : 'Delete'}
              </button>
            </div>

            {/* Fractile Management */}
            <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{locale === 'ja' ? 'パーセンタイル設定 (不確かさ)' : 'Percentiles (Uncertainty)'}</span>
                <button className="btn btn--secondary btn--sm" onClick={handleAddFractile}>+ {locale === 'ja' ? '追加' : 'Add'}</button>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selectedHazard.fractiles.map((f, i) => (
                  <div 
                    key={f.id}
                    onClick={() => setSelectedFractileId(f.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      background: selectedFractileId === f.id ? fractileColors[i % fractileColors.length] : 'var(--bg-canvas)',
                      color: selectedFractileId === f.id ? 'white' : 'var(--text-primary)',
                      border: '1px solid var(--border-default)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <input 
                      style={{ 
                        width: '40px', background: 'transparent', border: 'none', 
                        color: 'inherit', fontSize: 'inherit', fontWeight: 600, padding: 0 
                      }}
                      value={f.name}
                      onChange={(e) => handleUpdateFractile(f.id, { name: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8 }}>
                      <span style={{ fontSize: '10px' }}>%tile:</span>
                      <input 
                        type="number"
                        style={{ 
                          width: '45px', background: 'rgba(0,0,0,0.1)', border: 'none', 
                          color: 'inherit', fontSize: '10px', padding: '2px 4px', borderRadius: '2px'
                        }}
                        value={f.percentile}
                        step="0.05"
                        onChange={(e) => handleUpdateFractile(f.id, { percentile: parseFloat(e.target.value) || 0 })}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {selectedHazard.fractiles.length > 1 && (
                      <span 
                        onClick={(e) => { e.stopPropagation(); handleRemoveFractile(f.id); }}
                        style={{ marginLeft: '4px', opacity: 0.6, cursor: 'pointer' }}
                      >×</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
              {/* Left Column: Data Table */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h5 style={{ margin: 0, fontSize: '12px' }}>
                    {locale === 'ja' ? 'データポイント' : 'Data Points'} 
                    {selectedFractile && <span style={{ marginLeft: 8, color: 'var(--accent-blue)' }}>({selectedFractile.name})</span>}
                  </h5>
                  <button className="btn btn--ghost btn--sm" onClick={handleSortPoints} title={locale === 'ja' ? 'PGA順にソート' : 'Sort by PGA'}>
                    ⇅ {locale === 'ja' ? 'ソート' : 'Sort'}
                  </button>
                </div>
                <div className="table-wrapper" style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: '6px' }}>
                  <table className="data-table" style={{ border: 'none' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                      <tr>
                        <th>PGA (g)</th>
                        <th>Freq (/yr)</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFractile?.points.map((p, i) => (
                        <tr key={i}>
                          <td>
                            <input
                              type="number"
                              className="form-input form-input--sm form-input--mono"
                              value={p.pga}
                              step="0.01"
                              onChange={(e) => handleUpdatePoint(i, { pga: parseFloat(e.target.value) || 0 })}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-input form-input--sm form-input--mono"
                              value={p.frequency}
                              step="1e-6"
                              onChange={(e) => handleUpdatePoint(i, { frequency: parseFloat(e.target.value) || 0 })}
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
                <button className="btn btn--secondary btn--sm" onClick={handleAddPoint} style={{ width: '100%' }}>
                  + {locale === 'ja' ? '追加' : 'Add'}
                </button>
              </div>

              {/* Right Column: Visualization */}
              <div style={{ flex: 1.5, background: 'var(--bg-canvas)', borderRadius: '8px', border: '1px solid var(--border-default)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <h5 style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{locale === 'ja' ? 'ハザード曲線プレビュー' : 'Hazard Curve Preview'}</h5>
                <div style={{ flex: 1, minHeight: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mergedChartData} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" opacity={0.3} />
                      <XAxis 
                        dataKey="pga" 
                        type="number" 
                        scale="log" 
                        domain={['auto', 'auto']}
                        label={{ value: 'PGA (g)', position: 'insideBottom', offset: -10, fontSize: 11, fill: 'var(--text-tertiary)' }}
                        tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                        stroke="var(--border-default)"
                      />
                      <YAxis 
                        type="number" 
                        scale="log" 
                        domain={['auto', 'auto']}
                        label={{ value: 'Freq (/yr)', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--text-tertiary)' }}
                        tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                        stroke="var(--border-default)"
                      />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)', fontSize: '12px' }}
                        formatter={(value: any, name: string) => {
                          const fractile = selectedHazard.fractiles.find(f => f.id === name);
                          return [value.toExponential(3), fractile?.name || name];
                        }}
                        labelFormatter={(value: any) => `PGA: ${value}g`}
                      />
                      <Legend />
                      {selectedHazard.fractiles.map((f, i) => (
                        <Line 
                          key={f.id}
                          type="monotone" 
                          dataKey={f.id} 
                          name={f.name}
                          stroke={fractileColors[i % fractileColors.length]} 
                          strokeWidth={f.id === selectedFractileId ? 3 : 1.5} 
                          strokeDasharray={f.percentile === -1 ? "" : "5 5"}
                          dot={f.id === selectedFractileId ? { r: 4, fill: fractileColors[i % fractileColors.length] } : false} 
                          activeDot={{ r: 6 }} 
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '10px', textAlign: 'center' }}>
                  {locale === 'ja' ? '※破線はパーセンタイル、実線は平均値曲線を示します' : '*Dashed lines show percentiles, solid line shows the Mean curve'}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', borderRadius: '12px', border: '2px dashed var(--border-default)', opacity: 0.6 }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📈</div>
            <div style={{ fontSize: '14px' }}>{locale === 'ja' ? 'ハザード曲線を選択するか新規作成してください' : 'Select or create a hazard curve'}</div>
          </div>
        )}
      </div>
    </div>
  );
}
