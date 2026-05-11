'use client';

import React from 'react';
import { useModelStore } from '@/store/modelStore';
import { useResultsStore, runWorkerCommand } from '@/store/resultsStore';
import type { GlobalQuantificationSettings } from '@/lib/types';

interface QuantificationPanelProps {
  locale: 'ja' | 'en';
  onNavigateToResults?: () => void;
}

export default function QuantificationPanel({ locale, onNavigateToResults }: QuantificationPanelProps) {
  const model = useModelStore(s => s.model);
  const settings = model.quantificationSettings || {
    cutOff: 1e-20,
    approximation: 'bdd_exact',
    monteCarloSamples: 10000,
    useLHS: true,
    runUncertainty: false,
    maxCutsets: 100000
  };
  const updateSettings = useModelStore(s => s.updateQuantificationSettings);
  
  // Ensure settings.approximation is treated as an array safely
  const currentMethods: string[] = React.useMemo(() => {
    const raw = settings.approximation;
    if (Array.isArray(raw)) return raw;
    return raw ? [raw] : ['bdd_exact'];
  }, [settings.approximation]);

  const handleToggleMethod = (method: string) => {
    const next = currentMethods.includes(method)
      ? currentMethods.filter(m => m !== method)
      : [...currentMethods, method];
    // Keep at least one method? Or allow none? Let's allow none, but usually at least BDD is chosen.
    updateSettings({ ...settings, approximation: next as any });
  };
  
  const [cutOffInput, setCutOffInput] = React.useState(settings.cutOff.toString());

  React.useEffect(() => {
    setCutOffInput(settings.cutOff.toExponential());
  }, [settings.cutOff]);
  
  const results = useResultsStore(s => s.results || {});
  const activeResultId = useResultsStore(s => s.activeResultId);
  const setActiveResult = useResultsStore(s => s.setActiveResult);
  const setComputing = useResultsStore(s => s.setComputing);
  const setResult = useResultsStore(s => s.setResult);
  const setError = useResultsStore(s => s.setError);

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const faultTrees = model.faultTrees || [];
  const eventTrees = model.eventTrees || [];

  const runBatch = async () => {
    if (selectedIds.size === 0) return;
    setComputing(true);
    try {
      for (const id of Array.from(selectedIds)) {
        const isFT = faultTrees.some(f => f.id === id);
        const result = await runWorkerCommand<any>(isFT ? 'QUANTIFY_FT' : 'QUANTIFY_ET', { model, targetId: id });
        
        // Save intermediate result so that subsequent RUN_MONTE_CARLO can access it via resultsStore
        setResult(id, result);
        
        if (settings.runUncertainty) {
          const mc = await runWorkerCommand<any>('RUN_MONTE_CARLO', { 
            targetType: 'total', 
            targetId: id, 
            trials: settings.monteCarloSamples, 
            useLHS: settings.useLHS 
          });
          result.uncertainty = mc;
          setResult(id, result);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Batch quantification failed');
    } finally {
      setComputing(false);
    }
  };

  const handleChange = (key: keyof GlobalQuantificationSettings, value: any) => {
    updateSettings({ [key]: value });
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleGroup = (ids: string[], select: boolean) => {
    const next = new Set(selectedIds);
    ids.forEach(id => {
      if (select) next.add(id);
      else next.delete(id);
    });
    setSelectedIds(next);
  };

  const t = {
    title: locale === 'ja' ? '定量化設定' : 'Quantification Settings',
    cutOff: locale === 'ja' ? 'カットオフ値 (下限確率)' : 'Cut-off Threshold',
    approximation: locale === 'ja' ? '計算手法' : 'Calculation Method',
    maxCutsets: locale === 'ja' ? '最大カットセット数 (打ち切り値)' : 'Max Cutsets Limit',
    cutoffTip: locale === 'ja' 
      ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>💡 <strong>カットオフの注意点:</strong> 設定値を下げすぎると（例: 1e-40）、探索木が膨大になり極小確率の経路だけで「最大カットセット数」の枠を使い切ってしまいます。その結果、本来の支配的な組み合わせが抽出されなくなるため、近似値が急落する原因となります。</div>
          <div style={{ borderTop: '1px solid rgba(59, 130, 246, 0.2)', paddingTop: '6px' }}>
            💡 <strong>最大数と抽出数の差異:</strong> 最大数（打ち切り値）を大きく設定しても、最終的な「総MCS数」がそれより少なくなることがあります。これは抽出過程で他の短い組み合わせに包含（吸収）され、極小カットセットとして整理・削減されるためです。
          </div>
        </div>
      )
      : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>💡 <strong>Cut-off Caveat:</strong> Setting the threshold too low (e.g., 1e-40) can flood the extraction limit with negligible paths, locking out dominant combinations and causing computed probabilities to drop.</div>
          <div style={{ borderTop: '1px solid rgba(59, 130, 246, 0.2)', paddingTop: '6px' }}>
            💡 <strong>Discrepancy in Counts:</strong> The final MCS count may be lower than the specified "Max Cutsets". This is because redundant combinations are absorbed by smaller subsets during the minimization process.
          </div>
        </div>
      ),
    mcSamples: locale === 'ja' ? 'モンテカルロ試行回数' : 'Monte Carlo Samples',
    useLHS: locale === 'ja' ? 'LHS (Latin Hypercube Sampling) を使用' : 'Use Latin Hypercube Sampling (LHS)',
    runFT: locale === 'ja' ? 'FT定量化実行' : 'Run FT Quantification',
    runET: locale === 'ja' ? 'ET定量化実行' : 'Run ET Quantification',
    targetList: locale === 'ja' ? '解析対象リスト' : 'Analysis Targets',
    settingsDesc: locale === 'ja' ? '解析実行時の共通パラメーターを設定します。' : 'Set global parameters for quantification.',
    runSelected: locale === 'ja' ? '選択した解析を実行' : 'Run Selected Analysis',
    runUncertaintyLabel: locale === 'ja' ? '定量化後に不確かさ解析（モンテカルロ法）を実行する' : 'Run Uncertainty Analysis (Monte Carlo) after quantification',
    selectAll: locale === 'ja' ? 'すべて選択' : 'Select All',
    deselectAll: locale === 'ja' ? '選択解除' : 'Deselect',
    groupExact: locale === 'ja' ? '厳密評価 (Exact)' : 'Exact Evaluation',
    groupApprox: locale === 'ja' ? '近似評価 & カットセット設定 (Approx & MCS)' : 'Approximations & Cutsets',
  };

  const renderTargetItem = (target: any, isFT: boolean) => {
    const isSelected = selectedIds.has(target.id);
    const hasResult = !!results[target.id];
    const isActive = activeResultId === target.id;

    return (
      <div 
        key={target.id} 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          background: isActive ? 'var(--bg-secondary)' : 'var(--bg-primary)', 
          padding: '10px 16px', 
          borderRadius: '8px', 
          border: `1px solid ${isActive ? 'var(--accent-blue)' : 'var(--border-default)'}`,
          transition: 'all 0.2s',
          marginBottom: '4px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(target.id)} style={{ width: '16px', height: '16px' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>
              {isFT ? '🌳' : '🌿'} {target.name}
              {hasResult && <span style={{ marginLeft: 8, fontSize: '10px', color: 'var(--accent-green)', background: 'rgba(0,214,143,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{locale === 'ja' ? '完了' : 'Done'}</span>}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {hasResult && (
            <button 
              className={`btn btn--sm ${isActive ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => {
                setActiveResult(target.id);
                onNavigateToResults?.();
              }}
            >
              {locale === 'ja' ? '結果を表示' : 'View'}
            </button>
          )}
          <button 
            className="btn btn--ghost btn--sm"
            onClick={async () => {
              setComputing(true);
              try {
                const result = await runWorkerCommand<any>(isFT ? 'QUANTIFY_FT' : 'QUANTIFY_ET', { model, targetId: target.id });
                
                // Save intermediate result so that subsequent RUN_MONTE_CARLO can access it via resultsStore
                setResult(target.id, result);
                
                if (settings.runUncertainty) {
                  const mc = await runWorkerCommand<any>('RUN_MONTE_CARLO', { 
                    targetType: 'total', 
                    targetId: target.id, 
                    trials: settings.monteCarloSamples, 
                    useLHS: settings.useLHS 
                  });
                  result.uncertainty = mc;
                  setResult(target.id, result);
                }
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Quantification failed');
              } finally {
                setComputing(false);
              }
            }}
          >
            {locale === 'ja' ? '実行' : 'Run'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="quantification-panel" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>⚙️ {t.title}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{t.settingsDesc}</p>
        </div>
        <button 
          className="btn btn--primary" 
          disabled={selectedIds.size === 0} 
          onClick={runBatch}
          style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 600, boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
        >
          🚀 {t.runSelected} ({selectedIds.size})
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: All Configuration Sections */}
        <div style={{ display: 'grid', gap: '24px' }}>
        <section className="card" style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📊</span> {locale === 'ja' ? '基本設定' : 'Basic Settings'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '16px' }}>
            {/* Left Group: Exact Logic (Completely independent of cutsets) */}
            <div style={{ 
              background: 'rgba(59, 130, 246, 0.04)', 
              border: '1px solid rgba(59, 130, 246, 0.2)', 
              borderRadius: '8px', 
              padding: '16px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '12px', borderBottom: '1px solid rgba(59, 130, 246, 0.1)', paddingBottom: '6px' }}>
                🛡️ {t.groupExact}
              </div>
              <div className="form-group" style={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                  <input 
                    type="checkbox" 
                    checked={currentMethods.includes('bdd_exact')} 
                    onChange={() => handleToggleMethod('bdd_exact')} 
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>{locale === 'ja' ? 'BDD (厳密解)' : 'BDD (Exact)'}</span>
                </label>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic' }}>
                {locale === 'ja' ? '※カットオフの影響を受けません' : '* Unaffected by cut-off'}
              </div>
            </div>

            {/* Right Group: Approximation Logic & Cutset Extraction (Highly coupled) */}
            <div style={{ 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid var(--border-default)', 
              borderRadius: '8px', 
              padding: '16px' 
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                ✂️ {t.groupApprox}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Approximation Selections */}
                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {locale === 'ja' ? '近似手法の選択' : 'Approximation Methods'}
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input type="checkbox" checked={currentMethods.includes('rare_event')} onChange={() => handleToggleMethod('rare_event')} />
                      <span>{locale === 'ja' ? '稀事象近似' : 'Rare Event Approx'}</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input type="checkbox" checked={currentMethods.includes('mcub')} onChange={() => handleToggleMethod('mcub')} />
                      <span>{locale === 'ja' ? 'MCUB' : 'MCUB'}</span>
                    </label>
                  </div>
                </div>

                {/* Cutset Tuning Parameters */}
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ marginBottom: '4px', fontSize: '13px' }}>{t.cutOff}</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={cutOffInput} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setCutOffInput(val);
                        const parsed = parseFloat(val);
                        if (!isNaN(parsed) && parsed >= 0) {
                          handleChange('cutOff', parsed);
                        }
                      }}
                      onBlur={() => {
                        setCutOffInput(settings.cutOff.toExponential());
                      }}
                      placeholder="例: 1e-15"
                      style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ marginBottom: '4px', fontSize: '13px' }}>{t.maxCutsets}</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={settings.maxCutsets ?? 100000} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          handleChange('maxCutsets', val);
                        }
                      }}
                      min={1}
                      placeholder="例: 100000"
                      style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ 
            marginTop: '16px', 
            padding: '12px 16px', 
            background: 'rgba(59, 130, 246, 0.08)', 
            border: '1px solid rgba(59, 130, 246, 0.2)', 
            borderRadius: '8px', 
            fontSize: '12px', 
            lineHeight: '1.6', 
            color: 'var(--text-secondary)' 
          }}>
            {t.cutoffTip}
          </div>
        </section>

        <section className="card" style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎲</span> {locale === 'ja' ? '不確かさ解析設定' : 'Uncertainty Analysis'}
          </h3>
          <div style={{ display: 'grid', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '8px' }}>
              <input type="checkbox" checked={settings.runUncertainty} onChange={(e) => handleChange('runUncertainty', e.target.checked)} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-blue)' }}>{t.runUncertaintyLabel}</span>
            </label>
            <div className="form-group">
              <label className="form-label">{t.mcSamples}</label>
              <input type="number" className="form-input" value={settings.monteCarloSamples} onChange={(e) => handleChange('monteCarloSamples', parseInt(e.target.value))} style={{ width: '200px' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.useLHS} onChange={(e) => handleChange('useLHS', e.target.checked)} />
              <span style={{ fontSize: '14px' }}>{t.useLHS}</span>
            </label>
          </div>
        </section>
        </div>

        {/* Right Column: Targets List Section (Stacked Vertically) */}
        <div style={{ display: 'grid', gap: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 -8px 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎯</span> {t.targetList}
          </h3>
          {/* Fault Trees Section */}
          <section className="card" style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>🌳 Fault Trees</h3>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="btn btn--ghost btn--xs" onClick={() => toggleGroup(faultTrees.map(f => f.id), true)}>{t.selectAll}</button>
                <button className="btn btn--ghost btn--xs" onClick={() => toggleGroup(faultTrees.map(f => f.id), false)}>{t.deselectAll}</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {faultTrees.map(ft => renderTargetItem(ft, true))}
            </div>
          </section>

          {/* Event Trees Section */}
          <section className="card" style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>🌿 Event Trees</h3>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="btn btn--ghost btn--xs" onClick={() => toggleGroup(eventTrees.map(e => e.id), true)}>{t.selectAll}</button>
                <button className="btn btn--ghost btn--xs" onClick={() => toggleGroup(eventTrees.map(e => e.id), false)}>{t.deselectAll}</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {eventTrees.map(et => renderTargetItem(et, false))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
