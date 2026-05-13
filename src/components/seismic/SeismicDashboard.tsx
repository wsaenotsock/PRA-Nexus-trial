'use client';

import React, { useState, useMemo } from 'react';
import { useModelStore } from '@/store/modelStore';
import { useResultsStore } from '@/store/resultsStore';
import HazardEditor from './HazardEditor';
import FragilityTable from './FragilityTable';
import { runWorkerCommand } from '@/store/resultsStore';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { SeismicPointResult } from '@/lib/types';

interface SeismicDashboardProps {
  locale?: 'ja' | 'en';
}

export default function SeismicDashboard({ locale = 'ja' }: SeismicDashboardProps) {
  const model = useModelStore((s) => s.model);
  const selectedFaultTreeId = useModelStore((s) => s.selectedFaultTreeId);
  const updateBasicEvent = useModelStore((s) => s.updateBasicEvent);
  
  const results = useResultsStore((s) => s.results);
  const setResults = useResultsStore((s) => s.setResult);
  const setComputing = useResultsStore((s) => s.setComputing);

  const [activeTab, setActiveTab] = useState<'hazard' | 'fragility' | 'mapping' | 'settings' | 'results'>('hazard');
  const [selectedPoint, setSelectedPoint] = useState<SeismicPointResult | null>(null);

  const seismicResult = results['seismic']?.seismicResult;
  const seismicSettings = model.seismicSettings;
  const updateSeismicSettings = useModelStore((s) => s.updateSeismicSettings);

  const handleRunAnalysis = async () => {
    if (!seismicSettings.hazardCurveId || seismicSettings.selectedETIds.length === 0) {
      alert(locale === 'ja' ? 'ハザード曲線と評価対象イベントツリーを選択してください' : 'Please select Hazard Curve and at least one Event Tree');
      return;
    }

    setComputing(true);
    try {
      const res = await runWorkerCommand<any>('QUANTIFY_SEISMIC', { model });
      setResults('seismic', res);
      setSelectedPoint(null);
      setActiveTab('results');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setComputing(false);
    }
  };

  const getEventName = (id: string) => {
    if (id.startsWith('MANUAL_')) {
      const feId = id.replace('MANUAL_', '');
      const fe = model.eventTrees.flatMap(et => et.functionalEvents).find(f => f.id === feId);
      return fe ? `${fe.name} (失敗)` : id;
    }
    const be = model.basicEvents.find(b => b.id === id);
    if (be) return be.name;
    const ie = model.initiatingEvents.find(i => i.id === id);
    if (ie) return ie.name;
    return id;
  };

  const getEventProb = (id: string, point?: SeismicPointResult | null) => {
    const result = { total: 0, seismic: 0, random: 0 };

    if (id.startsWith('MANUAL_')) {
      const feId = id.replace('MANUAL_', '');
      const fe = model.eventTrees.flatMap(et => et.functionalEvents).find(f => f.id === feId);
      result.total = fe?.branches[0].probability ?? 1.0;
      result.random = result.total;
      return result;
    }
    const ie = model.initiatingEvents.find(i => i.id === id);
    if (ie) {
      result.total = 1.0;
      result.random = 1.0;
      return result;
    }

    const be = model.basicEvents.find(b => b.id === id);
    if (!be) return result;

    result.random = be.probability ?? 0;
    result.total = result.random;

    if (point && be.seismicFragilityId) {
      const fragility = model.seismicFragilities.find(f => f.id === be.seismicFragilityId);
      if (fragility) {
        const am = fragility.am ?? 1.0;
        const betaR = fragility.betaR ?? 0.2;
        const betaU = fragility.betaU ?? 0.2;
        const betaTot = Math.sqrt(betaR * betaR + betaU * betaU);
        const x = Math.log(point.pga / am) / betaTot;
        const erf = (val: number) => {
          const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
          const sign = (val < 0) ? -1 : 1; val = Math.abs(val);
          const t = 1.0 / (1.0 + p * val);
          const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-val * val);
          return sign * y;
        };
        result.seismic = 0.5 * (1 + erf(x / Math.sqrt(2)));
        result.total = 1 - (1 - result.seismic) * (1 - result.random);
      }
    }
    return result;
  };

  return (
    <div className="seismic-dashboard" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)' }}>
      <div className="seismic-dashboard__header" style={{ padding: '16px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="tabs" style={{ background: 'transparent', marginBottom: 0 }}>
          {['hazard', 'fragility', 'mapping', 'settings', 'results'].map((tab) => (
            <button 
              key={tab}
              className={`tab ${activeTab === tab ? 'tab--active' : ''}`} 
              onClick={() => setActiveTab(tab as any)}
            >
              {locale === 'ja' 
                ? {hazard:'ハザード', fragility:'フラジリティ', mapping:'マッピング', settings:'条件設定', results:'解析結果'}[tab]
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn--primary" onClick={handleRunAnalysis}>
          ▶ {locale === 'ja' ? '地震解析実行' : 'Run Seismic Analysis'}
        </button>
      </div>

      <div className="seismic-dashboard__content" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {activeTab === 'hazard' && <HazardEditor locale={locale} />}
        {activeTab === 'fragility' && <FragilityTable locale={locale} />}

        {activeTab === 'mapping' && (
          <div className="mapping-view">
            <h3 style={{ fontSize: '14px', marginBottom: 12 }}>{locale === 'ja' ? '基本事象へのフラジリティ割当' : 'Fragility Assignment'}</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{locale === 'ja' ? '基本事象' : 'Basic Event'}</th>
                  <th>{locale === 'ja' ? '現在の確率' : 'Static Prob'}</th>
                  <th>{locale === 'ja' ? 'フラジリティ曲線' : 'Fragility Curve'}</th>
                </tr>
              </thead>
              <tbody>
                {model.basicEvents.map((be) => (
                  <tr key={be.id}>
                    <td>{be.name}</td>
                    <td style={{ fontFamily: 'monospace' }}>{be.probability?.toExponential(2)}</td>
                    <td>
                      <select
                        className="form-select form-select--sm"
                        value={be.seismicFragilityId || ''}
                        onChange={(e) => updateBasicEvent({ ...be, seismicFragilityId: e.target.value || undefined })}
                      >
                        <option value="">-- {locale === 'ja' ? '未割当' : 'Not Assigned'} --</option>
                        {model.seismicFragilities?.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-view" style={{ maxWidth: '600px', margin: '0 auto', background: 'var(--bg-canvas)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>⚙️ {locale === 'ja' ? '定量化条件設定' : 'Settings'}</h3>
            <div className="form-group">
              <label className="form-label">{locale === 'ja' ? 'ハザード曲線' : 'Hazard Curve'}</label>
              <select className="form-select" value={seismicSettings.hazardCurveId} onChange={(e) => updateSeismicSettings({ hazardCurveId: e.target.value })}>
                <option value="">-- {locale === 'ja' ? '選択してください' : 'Select...'} --</option>
                {model.seismicHazards.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{locale === 'ja' ? '評価対象イベントツリー' : 'Target ETs'}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                {model.eventTrees.map(et => (
                  <label key={et.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={seismicSettings.selectedETIds.includes(et.id)}
                      onChange={(e) => {
                        const newIds = e.target.checked ? [...seismicSettings.selectedETIds, et.id] : seismicSettings.selectedETIds.filter(id => id !== et.id);
                        updateSeismicSettings({ selectedETIds: newIds });
                      }}
                    />
                    {et.name}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Min PGA (g)</label>
                <input type="number" className="form-input" value={seismicSettings.minPGA} step="0.01" onChange={(e) => updateSeismicSettings({ minPGA: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="form-group">
                <label className="form-label">Max PGA (g)</label>
                <input type="number" className="form-input" value={seismicSettings.maxPGA} step="0.1" onChange={(e) => updateSeismicSettings({ maxPGA: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ja' ? '区間分割数' : 'Intervals'}</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={seismicSettings.intervals} 
                  min={2}
                  max={500}
                  step="1" 
                  onChange={(e) => updateSeismicSettings({ intervals: parseInt(e.target.value) || 20 })} 
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">{locale === 'ja' ? '不確実さ解析を実行' : 'Enable Uncertainty'}</label>
                <div style={{ display: 'flex', alignItems: 'center', height: '36px' }}>
                  <input
                    type="checkbox"
                    checked={seismicSettings.uncertaintyEnabled}
                    onChange={(e) => updateSeismicSettings({ uncertaintyEnabled: e.target.checked })}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{locale === 'ja' ? 'サンプリング数' : 'MC Samples'}</label>
                <input
                  type="number"
                  className="form-input"
                  value={seismicSettings.samples || 1000}
                  min={10}
                  max={10000}
                  disabled={!seismicSettings.uncertaintyEnabled}
                  onChange={(e) => updateSeismicSettings({ samples: parseInt(e.target.value) || 1000 })}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="results-view">
            {seismicResult ? (
              <div className="seismic-results">
                <div className="result-summary-grid" style={{ display: 'grid', gridTemplateColumns: seismicResult.uncertaintyResult ? 'repeat(4, 1fr)' : '1fr', gap: '16px', marginBottom: '24px' }}>
                  <div className="result-summary-card" style={{ background: 'var(--bg-canvas)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-default)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: 4 }}>{locale === 'ja' ? '平均頻度 (Mean)' : 'Mean Frequency'}</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-red)', fontFamily: 'monospace' }}>
                      {(seismicResult.uncertaintyResult?.mean || seismicResult.totalFrequency).toExponential(4)}
                    </div>
                  </div>
                  {seismicResult.uncertaintyResult && (
                    <>
                      <div className="result-summary-card" style={{ background: 'var(--bg-canvas)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-default)', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: 4 }}>{locale === 'ja' ? '中央値 (Median)' : 'Median'}</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-amber)', fontFamily: 'monospace' }}>
                          {seismicResult.uncertaintyResult.median.toExponential(4)}
                        </div>
                      </div>
                      <div className="result-summary-card" style={{ background: 'var(--bg-canvas)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-default)', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: 4 }}>5% Fractile</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-blue)', fontFamily: 'monospace' }}>
                          {seismicResult.uncertaintyResult.p05.toExponential(4)}
                        </div>
                      </div>
                      <div className="result-summary-card" style={{ background: 'var(--bg-canvas)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-default)', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: 4 }}>95% Fractile</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-green)', fontFamily: 'monospace' }}>
                          {seismicResult.uncertaintyResult.p95.toExponential(4)}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="chart-container" style={{ height: 500, background: 'var(--bg-canvas)', padding: 24, borderRadius: 12, border: '1px solid var(--border-default)', marginBottom: 24 }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600 }}>
                    {locale === 'ja' ? '地震リスク・プロファイル (複合表示)' : 'Seismic Risk Profile (Combined)'}
                  </h4>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '16px', display: 'flex', gap: '16px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 12, height: 2, background: '#3b82f6' }}></span> {locale === 'ja' ? 'ハザード頻度 (左軸/対数)' : 'Hazard (Left/Log)'}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 12, height: 2, background: '#f59e0b', borderWidth: 2, borderStyle: 'solid' }}></span> {locale === 'ja' ? 'CCDP (右軸1/線形)' : 'CCDP (Right1/Linear)'}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 12, height: 8, background: '#ef4444', opacity: 0.5 }}></span> {locale === 'ja' ? 'リスク寄与度 (右軸2/線形)' : 'Contribution (Right2/Linear)'}</span>
                  </div>
                  <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={seismicResult.curve} margin={{ top: 10, right: 60, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="pga" 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} 
                        label={{ value: 'PGA (g)', position: 'insideBottom', offset: -10, fill: 'var(--text-secondary)', fontSize: 11 }} 
                      />
                      <YAxis 
                        yAxisId="hazard"
                        scale="log"
                        domain={['auto', 'auto']}
                        tick={{ fill: '#3b82f6', fontSize: 10 }}
                        label={{ value: locale === 'ja' ? 'ハザード頻度 (/yr)' : 'Hazard Freq', angle: -90, position: 'insideLeft', fill: '#3b82f6', fontSize: 11 }}
                      />
                      <YAxis 
                        yAxisId="ccdp"
                        orientation="right"
                        domain={[0, 1]}
                        tick={{ fill: '#f59e0b', fontSize: 10 }}
                        label={{ value: 'CCDP', angle: 90, position: 'insideRight', offset: 10, fill: '#f59e0b', fontSize: 11 }}
                      />
                      <YAxis 
                        yAxisId="contribution"
                        orientation="right"
                        hide
                      />
                      <Tooltip 
                        contentStyle={{ background: 'rgba(20, 20, 25, 0.95)', border: '1px solid var(--border-default)', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                      />
                      <Line 
                        yAxisId="hazard"
                        type="monotone" 
                        dataKey="hazardFreq" 
                        name={locale === 'ja' ? 'ハザード頻度' : 'Hazard'}
                        stroke="#3b82f6" 
                        dot={false}
                        strokeWidth={2}
                      />
                      <Line 
                        yAxisId="ccdp"
                        type="monotone" 
                        dataKey="ccdp" 
                        name="CCDP"
                        stroke="#f59e0b" 
                        dot={false}
                        strokeWidth={3}
                      />
                      <Bar 
                        yAxisId="contribution" 
                        dataKey="contribution" 
                        name={locale === 'ja' ? 'リスク寄与度' : 'Contribution'}
                        fill="#ef4444" 
                        opacity={0.4} 
                        radius={[2, 2, 0, 0]}
                        onClick={(data) => { if (data && data.payload) setSelectedPoint(data.payload); }}
                        style={{ cursor: 'pointer' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {seismicResult.uncertaintyResult && (
                  <div className="chart-container" style={{ height: 450, background: 'var(--bg-canvas)', padding: 24, borderRadius: 12, border: '1px solid var(--border-default)', marginBottom: 24 }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600 }}>
                      {locale === 'ja' ? '地震リスク・不確実さ曲線 (不確実性幅)' : 'Seismic Risk Uncertainty Curves (Fractiles)'}
                    </h4>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 12, height: 2, background: 'var(--accent-red)' }}></span> {locale === 'ja' ? '平均値 (Mean)' : 'Mean'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 12, height: 2, background: 'var(--accent-amber)' }}></span> {locale === 'ja' ? '中央値 (50%)' : 'Median (50%)'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 12, height: 2, borderBottom: '2px dashed var(--accent-blue)' }}></span> 5% Fractile</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 12, height: 2, borderBottom: '2px dashed var(--accent-green)' }}></span> 95% Fractile</span>
                    </div>
                    <ResponsiveContainer width="100%" height="80%">
                      <LineChart margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis 
                          type="number"
                          dataKey="pga" 
                          domain={['auto', 'auto']}
                          tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} 
                          label={{ value: locale === 'ja' ? '加速度 PGA (g)' : 'PGA (g)', position: 'insideBottom', offset: -10, fill: 'var(--text-secondary)', fontSize: 11 }} 
                        />
                        <YAxis 
                          scale="log"
                          domain={['auto', 'auto']}
                          tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                          tickFormatter={(v) => v.toExponential(0)}
                          label={{ value: locale === 'ja' ? '頻度 (/yr)' : 'Frequency (/yr)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 11 }}
                        />
                        <Tooltip 
                          formatter={(val: any) => [val.toExponential(4), locale === 'ja' ? '頻度' : 'Freq']}
                          labelFormatter={(val: any) => `PGA: ${val}g`}
                          contentStyle={{ background: 'rgba(20, 20, 25, 0.95)', border: '1px solid var(--border-default)', borderRadius: '8px' }}
                        />
                        <Line data={seismicResult.uncertaintyResult.fractileCurves[0].curve} type="monotone" dataKey="contribution" name="Mean" stroke="var(--accent-red)" strokeWidth={2} dot={false} />
                        <Line data={seismicResult.uncertaintyResult.fractileCurves[1].curve} type="monotone" dataKey="contribution" name="5%" stroke="var(--accent-blue)" strokeDasharray="5 5" dot={false} />
                        <Line data={seismicResult.uncertaintyResult.fractileCurves[2].curve} type="monotone" dataKey="contribution" name="50%" stroke="var(--accent-amber)" strokeWidth={2} dot={false} />
                        <Line data={seismicResult.uncertaintyResult.fractileCurves[3].curve} type="monotone" dataKey="contribution" name="95%" stroke="var(--accent-green)" strokeDasharray="5 5" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {seismicResult.uncertaintyResult && (
                  <div className="chart-container" style={{ height: 350, background: 'var(--bg-canvas)', padding: 24, borderRadius: 12, border: '1px solid var(--border-default)', marginBottom: 24 }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600 }}>
                      {locale === 'ja' ? 'リスク頻度分布 (PDF)' : 'Frequency Distribution (PDF)'}
                    </h4>
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart data={seismicResult.uncertaintyResult.distribution}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis 
                          dataKey="value" 
                          tickFormatter={(v) => v.toExponential(0)}
                          tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} 
                          label={{ value: locale === 'ja' ? '頻度 (/yr)' : 'Frequency (/yr)', position: 'insideBottom', offset: -10, fill: 'var(--text-secondary)', fontSize: 11 }} 
                        />
                        <YAxis 
                          tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                          label={{ value: locale === 'ja' ? '相対頻度' : 'Rel. Freq', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 11 }}
                        />
                        <Tooltip 
                          formatter={(val: any) => [val.toFixed(3), locale === 'ja' ? '確率密度' : 'Density']}
                          labelFormatter={(val: any) => `${locale === 'ja' ? '頻度' : 'Freq'}: ${val.toExponential(2)}`}
                          contentStyle={{ background: 'rgba(20, 20, 25, 0.95)', border: '1px solid var(--border-default)', borderRadius: '8px' }}
                        />
                        <Bar dataKey="probability" fill="var(--accent-primary)" radius={[2, 2, 0, 0]} opacity={0.6} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="cutsets-section" style={{ background: 'var(--bg-canvas)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px' }}>
                      {selectedPoint 
                        ? `${locale === 'ja' ? 'PGA' : 'PGA'}: ${selectedPoint.pga}g ${locale === 'ja' ? 'のカットセット' : 'Cut Sets'}`
                        : (locale === 'ja' ? '全体カットセット (統合頻度)' : 'Overall Cut Sets')}
                    </h4>
                    {selectedPoint && <button className="btn btn--sm" onClick={() => setSelectedPoint(null)}>{locale === 'ja' ? '全体を表示' : 'Show Overall'}</button>}
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>{locale === 'ja' ? 'カットセット（事象名 : 確率/頻度）' : 'Cut Set (Event : Prob/Freq)'}</th>
                        <th style={{ width: '120px', textAlign: 'right' }}>{locale === 'ja' ? '頻度/確率' : 'Total Freq/Prob'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedPoint?.cutSets || seismicResult.cutSets || []).slice(0, 50).map((cs, idx) => (
                        <tr key={idx}>
                          <td style={{ opacity: 0.5 }}>{idx + 1}</td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {cs.events.map((ev, eidx) => {
                                const { total, seismic, random } = getEventProb(ev, selectedPoint);
                                return (
                                  <span key={eidx} style={{ padding: '4px 8px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '11px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '100px' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{getEventName(ev)}</span>
                                    <div style={{ display: 'flex', gap: '8px', opacity: 0.8, fontSize: '10px' }}>
                                      {seismic > 0 && (
                                        <span style={{ color: 'var(--accent-blue)' }}>S: {seismic.toExponential(1)}</span>
                                      )}
                                      <span style={{ color: 'var(--text-tertiary)' }}>R: {random.toExponential(1)}</span>
                                    </div>
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{cs.probability.toExponential(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>{locale === 'ja' ? '解析を実行してください' : 'Run analysis'}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
