'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { runWorkerCommand } from '@/store/resultsStore';
import type { UncertaintyResult } from '@/engine/monte_carlo';
import { useModelStore } from '@/store/modelStore';
import { useResultsStore } from '@/store/resultsStore';

interface UncertaintyPanelProps {
  locale?: 'ja' | 'en';
}

export default function UncertaintyPanel({ locale = 'ja' }: UncertaintyPanelProps) {
  const model = useModelStore((s) => s.model);
  const selectedEventTreeId = useModelStore((s) => s.selectedEventTreeId);
  const results = useResultsStore((s) => s.results);
  const activeResultId = useResultsStore((s) => s.activeResultId);
  const result = activeResultId ? results[activeResultId] : null;
  
  const et = useMemo(() => 
    selectedEventTreeId ? model.eventTrees.find(t => t.id === selectedEventTreeId) : undefined
  , [model.eventTrees, selectedEventTreeId]);

  const [trials, setTrials] = useState(1000);
  const [isSimulating, setIsSimulating] = useState(false);
  const [mcResult, setMcResult] = useState<UncertaintyResult | null>(null);
  const [isEmptyTarget, setIsEmptyTarget] = useState(false);

  // Sync with pre-calculated uncertainty if available
  useEffect(() => {
    if (result?.uncertainty && !mcResult) {
      setMcResult(result.uncertainty);
    }
  }, [result, mcResult]);

  // Axis and Scale Settings
  const [axisType, setAxisType] = useState<'linear' | 'log'>('log');
  const [autoScale, setAutoScale] = useState(true);
  const [minLimit, setMinLimit] = useState<string>('');
  const [maxLimit, setMaxLimit] = useState<string>('');

  // Target Selection
  const [targetType, setTargetType] = useState<'total' | 'category' | 'endstate'>('total');
  const [targetId, setTargetId] = useState<string>('');
  const [useLHS, setUseLHS] = useState<boolean>(false);

  const handleRunSimulation = async () => {
    if (!result) return;
    
    if (!et && targetType !== 'total') {
      alert(locale === 'ja' ? 'イベントツリーが選択されていません。' : 'Event Tree not selected.');
      return;
    }

    setIsEmptyTarget(false);
    setIsSimulating(true);

    try {
      const mc = await runWorkerCommand<UncertaintyResult>('RUN_MONTE_CARLO', {
        targetType,
        targetId,
        trials,
        useLHS
      });

      if (!mc) {
        setIsEmptyTarget(true);
        setMcResult(null);
      } else {
        setMcResult(mc);
      }
    } catch (err) {
      console.error('Monte Carlo Error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const histogramData = useMemo(() => {
    if (!mcResult || mcResult.distribution.length === 0) return null;
    const samples = mcResult.distribution.filter(s => s > 0);
    if (samples.length === 0) return null;

    const binCount = 40;
    const dataMin = samples[0];
    const dataMax = samples[samples.length - 1];
    
    // Determine bounds
    const min = (!autoScale && minLimit) ? parseFloat(minLimit) : dataMin;
    const max = (!autoScale && maxLimit) ? parseFloat(maxLimit) : dataMax;
    
    if (axisType === 'log') {
      const logMin = Math.log10(min);
      const logMax = Math.log10(max);
      const logRange = logMax - logMin;
      
      const binWidth = logRange / binCount;
      const bins = new Array(binCount).fill(0);
      
      samples.forEach(s => {
        const logS = Math.log10(s);
        if (logS >= logMin && logS <= logMax) {
          const binIdx = Math.min(Math.floor((logS - logMin) / binWidth), binCount - 1);
          if (binIdx >= 0) bins[binIdx]++;
        }
      });
      return { bins, min, max, logMin, logMax, isLog: true };
    } else {
      const range = max - min;
      const binWidth = range / binCount;
      const bins = new Array(binCount).fill(0);
      samples.forEach(s => {
        if (s >= min && s <= max) {
          const binIdx = Math.min(Math.floor((s - min) / binWidth), binCount - 1);
          if (binIdx >= 0) bins[binIdx]++;
        }
      });
      return { bins, min, max, isLog: false };
    }
  }, [mcResult, axisType, autoScale, minLimit, maxLimit]);

  return (
    <div className="uncertainty-panel">
      {/* Simulation Configuration */}
      <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', marginBottom: 'var(--space-md)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xl)', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{locale === 'ja' ? '解析対象' : 'Target'}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select 
                className="form-control" 
                value={targetType} 
                onChange={(e) => {
                  setTargetType(e.target.value as any);
                  setTargetId('');
                }}
                style={{ width: '140px' }}
              >
                <option value="total">{locale === 'ja' ? '全体リスク' : 'Total Risk'}</option>
                <option value="category">{locale === 'ja' ? 'カテゴリ別' : 'By Category'}</option>
                <option value="endstate">{locale === 'ja' ? '終状態別' : 'By End State'}</option>
              </select>

                  {targetType === 'category' && (
                    <select 
                      className="form-control" 
                      value={targetId} 
                      onChange={(e) => setTargetId(e.target.value)}
                      style={{ width: '160px' }}
                    >
                      <option value="">-- {locale === 'ja' ? '選択してください' : 'Select Category'} --</option>
                      {Array.from(new Set(model.endStates.flatMap(es => es.categories || []))).sort().map(cat => {
                        const hasSequences = et?.sequences.some(s => {
                          const es = model.endStates.find(e => e.id === s.endStateId);
                          return es?.categories?.includes(cat);
                        });
                        return (
                          <option key={cat} value={cat}>
                            {cat} {!hasSequences ? (locale === 'ja' ? ' (対象外)' : ' (N/A)') : ''}
                          </option>
                        );
                      })}
                    </select>
                  )}

                  {targetType === 'endstate' && (
                    <select 
                      className="form-control" 
                      value={targetId} 
                      onChange={(e) => setTargetId(e.target.value)}
                      style={{ width: '160px' }}
                    >
                      <option value="">-- {locale === 'ja' ? '選択してください' : 'Select End State'} --</option>
                      {model.endStates.map(es => {
                        const hasSequences = et?.sequences.some(s => s.endStateId === es.id);
                        return (
                          <option key={es.id} value={es.id}>
                            {es.name} {!hasSequences ? (locale === 'ja' ? ' (対象外)' : ' (N/A)') : ''}
                          </option>
                        );
                      })}
                    </select>
                  )}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{locale === 'ja' ? '試行回数' : 'Trials'}</label>
            <input 
              type="number" 
              className="form-control" 
              value={trials} 
              onChange={(e) => setTrials(parseInt(e.target.value) || 1000)}
              style={{ width: '100px' }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px', marginTop: '24px' }}>
            <input 
              type="checkbox" 
              id="useLHS" 
              checked={useLHS} 
              onChange={(e) => setUseLHS(e.target.checked)} 
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="useLHS" style={{ fontSize: '12px', fontWeight: 600, cursor: 'pointer', margin: 0 }}>
              {locale === 'ja' ? 'LHS (ラテン超方格サンプリング)' : 'Use LHS'}
            </label>
          </div>
          
          <button 
            className="btn btn--primary" 
            onClick={handleRunSimulation}
            disabled={isSimulating || (targetType !== 'total' && !targetId)}
            style={{ minWidth: '160px' }}
          >
            {isSimulating ? (locale === 'ja' ? '⌛ シミュレーション中...' : '⌛ Simulating...') : `⚡ ${locale === 'ja' ? 'シミュレーション開始' : 'Run Simulation'}`}
          </button>
        </div>
      </div>

      {mcResult ? (
        <div className="animate-fadeIn">
          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
            {[
              { label: locale === 'ja' ? '平均値 (Mean)' : 'Mean', value: mcResult?.mean, color: 'var(--accent-blue)' },
              { label: '5% (Lower Bound)', value: mcResult?.p5, color: 'var(--text-tertiary)' },
              { label: '50% (Median)', value: mcResult?.p50, color: 'var(--accent-amber)' },
              { label: '95% (Upper Bound)', value: mcResult?.p95, color: 'var(--accent-red)' },
            ].map((stat, i) => (
              <div key={i} className="stat-card" style={{ borderLeft: `3px solid ${stat.color}` }}>
                <div className="stat-card__label">{stat.label}</div>
                <div className="stat-card__value" style={{ fontSize: '18px' }}>
                  {isEmptyTarget ? 'N/A' : (stat.value?.toExponential(3) || '—')}
                </div>
              </div>
            ))}
          </div>

          {/* Histogram Controls */}
          <div style={{ 
            background: 'var(--bg-secondary)', padding: 'var(--space-lg)', 
            borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)',
            marginBottom: 'var(--space-md)'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-xl)' }}>
              {/* Axis Type */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{locale === 'ja' ? '軸の種類:' : 'Axis:'}</span>
                <div className="btn-group">
                  <button 
                    className={`btn btn--sm ${axisType === 'linear' ? 'btn--primary' : 'btn--ghost'}`}
                    onClick={() => setAxisType('linear')}
                  >
                    {locale === 'ja' ? '線形' : 'Linear'}
                  </button>
                  <button 
                    className={`btn btn--sm ${axisType === 'log' ? 'btn--primary' : 'btn--ghost'}`}
                    onClick={() => setAxisType('log')}
                  >
                    {locale === 'ja' ? '対数' : 'Log'}
                  </button>
                </div>
              </div>

              {/* Scale Mode */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={autoScale} 
                    onChange={(e) => setAutoScale(e.target.checked)} 
                  />
                  {locale === 'ja' ? '自動スケール' : 'Auto Scale'}
                </label>
                
                {!autoScale && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'var(--space-sm)' }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Min (e.g. 1e-8)"
                      value={minLimit}
                      onChange={(e) => setMinLimit(e.target.value)}
                      style={{ width: '100px', fontSize: '11px', padding: '4px 8px' }}
                    />
                    <span style={{ color: 'var(--text-tertiary)' }}>~</span>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Max (e.g. 1e-4)"
                      value={maxLimit}
                      onChange={(e) => setMaxLimit(e.target.value)}
                      style={{ width: '100px', fontSize: '11px', padding: '4px 8px' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Histogram Visualization */}
          <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
            <h4 style={{ marginTop: 0, marginBottom: 'var(--space-lg)', fontSize: '14px' }}>
              {locale === 'ja' ? '頻度分布 (Probability Density)' : 'Probability Density'}
            </h4>
            
            {isEmptyTarget ? (
              <div style={{ height: '260px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>∅</div>
                <div>{locale === 'ja' ? '評価対象となるシーケンスが存在しません' : 'No target sequences found'}</div>
              </div>
            ) : histogramData ? (
              <div style={{ padding: '0 var(--space-md)', marginTop: 'var(--space-md)' }}>
                <div style={{ height: '200px', width: '100%', position: 'relative' }}>
                  <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                    {/* Grid lines (Vertical - Log ticks) */}
                    {histogramData.isLog && (() => {
                      const ticks = [];
                      const startExp = Math.ceil(histogramData.logMin!);
                      const endExp = Math.floor(histogramData.logMax!);
                      for (let e = startExp; e <= endExp; e++) {
                        const x = ((e - histogramData.logMin!) / (histogramData.logMax! - histogramData.logMin!)) * 500;
                        ticks.push(
                          <line key={e} x1={x} y1="0" x2={x} y2="200" stroke="var(--border-default)" strokeWidth="1" strokeDasharray="2 2" />
                        );
                      }
                      return ticks;
                    })()}

                    {/* Horizontal grid */}
                    {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                      <line key={tick} x1="0" y1={200 - tick * 200} x2="500" y2={200 - tick * 200} stroke="var(--border-default)" strokeWidth="0.5" />
                    ))}
                    
                    {/* Bins */}
                    {histogramData.bins.map((count, i) => {
                      const maxCount = Math.max(...histogramData.bins);
                      const height = (count / maxCount) * 180;
                      const x = (i / histogramData.bins.length) * 500;
                      const width = (500 / histogramData.bins.length) - 0.5;
                      return (
                        <rect 
                          key={i} 
                          x={x} 
                          y={200 - height} 
                          width={width} 
                          height={height} 
                          fill="var(--accent-blue)" 
                          opacity="0.7"
                          rx="1"
                        >
                          <title>{`Count: ${count}`}</title>
                        </rect>
                      );
                    })}
                  </svg>

                  {/* X-axis labels (Log ticks) - HTML to prevent distortion */}
                  {histogramData.isLog && (
                    <div style={{ position: 'absolute', top: '205px', left: 0, width: '100%', height: '20px' }}>
                      {(() => {
                        const ticks = [];
                        const startExp = Math.ceil(histogramData.logMin!);
                        const endExp = Math.floor(histogramData.logMax!);
                        for (let e = startExp; e <= endExp; e++) {
                          const left = ((e - histogramData.logMin!) / (histogramData.logMax! - histogramData.logMin!)) * 100;
                          ticks.push(
                            <div key={e} style={{ position: 'absolute', left: `${left}%`, transform: 'translateX(-50%)', fontSize: '9px', color: 'var(--text-tertiary)' }}>
                              10<sup>{e}</sup>
                            </div>
                          );
                        }
                        return ticks;
                      })()}
                    </div>
                  )}
                </div>

                {/* Min/Max and Center Labels - HTML */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  <span>{histogramData.min.toExponential(1)}</span>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {locale === 'ja' ? `非成功頻度合計 (${histogramData.isLog ? '対数軸' : '線形軸'})` : `Total Frequency (${histogramData.isLog ? 'Log Scale' : 'Linear Scale'})`}
                  </div>
                  <span>{histogramData.max.toExponential(1)}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-tertiary)', border: '2px dashed var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '32px', marginBottom: 'var(--space-md)' }}>🎲</div>
          <div>{locale === 'ja' ? 'パラメータを設定し、シミュレーションを開始してください。' : 'Configure parameters and run the simulation.'}</div>
        </div>
      )}

      <style jsx>{`
        .uncertainty-panel {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
      `}</style>
    </div>
  );
}
