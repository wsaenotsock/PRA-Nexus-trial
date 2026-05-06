'use client';

import React, { useMemo, useState } from 'react';
import { useResultsStore } from '@/store/resultsStore';
import { useModelStore } from '@/store/modelStore';
import UncertaintyPanel from './UncertaintyPanel';
import SensitivityPanel from './SensitivityPanel';
import { downloadFile, jsonToCsv } from '@/lib/utils/export';

interface ResultsDashboardProps {
  locale?: 'ja' | 'en';
}

type ImportanceTab = 'fv' | 'raw' | 'rrw' | 'birnbaum';

export default function ResultsDashboard({ locale = 'ja' }: ResultsDashboardProps) {
  const results = useResultsStore((s) => s.results);
  const activeResultId = useResultsStore((s) => s.activeResultId);
  const result = activeResultId ? results[activeResultId] : null;
  const isComputing = useResultsStore((s) => s.isComputing);
  const model = useModelStore((s) => s.model);
  const [activeTab, setActiveTab] = useState<'cutsets' | 'importance' | 'endstates' | 'sequences' | 'uncertainty' | 'sensitivity'>('cutsets');
  const [importanceTab, setImportanceTab] = useState<ImportanceTab>('fv');
  const [maxCutsets, setMaxCutsets] = useState(50);
  const [selectedSeqId, setSelectedSeqId] = useState<string | null>(null);

  const t = useMemo(() => ({
    title: locale === 'ja' ? '解析結果' : 'Results',
    topEvent: locale === 'ja' ? 'トップイベント確率 / 非成功頻度合計' : 'Top Event Prob / Total Non-Success',
    bddExact: locale === 'ja' ? 'BDD精密値' : 'BDD Exact',
    rareEvent: locale === 'ja' ? 'Rare Event近似' : 'Rare Event Approx',
    computeTime: locale === 'ja' ? '計算時間' : 'Compute Time',
    cutsets: locale === 'ja' ? 'カットセット' : 'Cut Sets',
    importance: locale === 'ja' ? '重要度指標' : 'Importance',
    endstates: locale === 'ja' ? '終状態別頻度' : 'End State Freq',
    uncertainty: locale === 'ja' ? '不確かさ解析' : 'Uncertainty',
    sensitivity: locale === 'ja' ? '感度解析' : 'Sensitivity',
    sequences: locale === 'ja' ? 'シーケンス別頻度' : 'Sequence Freq',
    totalMCS: locale === 'ja' ? '総MCS数' : 'Total MCS',
    rank: locale === 'ja' ? '順位' : 'Rank',
    events: locale === 'ja' ? '基事象' : 'Events',
    order: locale === 'ja' ? '次数' : 'Order',
    probability: locale === 'ja' ? '確率' : 'Probability',
    eventName: locale === 'ja' ? '事象名' : 'Event Name',
    cdfTotal: locale === 'ja' ? 'CDF合計' : 'Total CDF',
    endStateName: locale === 'ja' ? '終状態' : 'End State',
    category: locale === 'ja' ? 'カテゴリ' : 'Category',
    frequency: locale === 'ja' ? '頻度 [/yr]' : 'Frequency [/yr]',
    contribution: locale === 'ja' ? '寄与率' : 'Contribution',
    path: locale === 'ja' ? 'パス' : 'Path',
    sequenceName: locale === 'ja' ? 'シーケンス名' : 'Seq Name',
    noResults: locale === 'ja' ? '定量化を実行してください' : 'Run quantification',
    computing: locale === 'ja' ? '計算中...' : 'Computing...',
  }), [locale]);

  const selectedSeq = useMemo(() => {
    if (!selectedSeqId || !result?.sequenceResults) return null;
    return result.sequenceResults.find(s => s.sequenceId === selectedSeqId);
  }, [selectedSeqId, result]);

  const sortedImportance = useMemo(() => {
    const source = selectedSeq ? selectedSeq.importanceMeasures : result?.importanceMeasures;
    return [...(source || [])].sort((a, b) => {
      switch (importanceTab) {
        case 'fv': return b.fv - a.fv;
        case 'raw': return b.raw - a.raw;
        case 'rrw': return b.rrw - a.rrw;
        case 'birnbaum': return b.birnbaum - a.birnbaum;
        default: return 0;
      }
    });
  }, [selectedSeq, result, importanceTab]);

  const maxImportanceValue = useMemo(() => {
    if (!sortedImportance.length) return 0.001;
    return Math.max(
      ...sortedImportance.map((m) => {
        switch (importanceTab) {
          case 'fv': return m.fv;
          case 'raw': return m.raw;
          case 'rrw': return m.rrw;
          case 'birnbaum': return m.birnbaum;
          default: return 0;
        }
      }),
      0.001
    );
  }, [sortedImportance, importanceTab]);

  const displayedCutsets = useMemo(() => {
    const source = selectedSeq ? selectedSeq.cutSets : result?.cutSets;
    return (source || []).slice(0, maxCutsets);
  }, [selectedSeq, result, maxCutsets]);

  if (isComputing) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 'var(--space-md)'
      }}>
        <div className="animate-pulse" style={{
          width: 64, height: 64, borderRadius: 'var(--radius-full)',
          background: 'linear-gradient(135deg, var(--accent-green), var(--accent-cyan))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28
        }}>⚛</div>
        <div style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{t.computing}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="empty-state" style={{ height: '100%' }}>
        <div className="empty-state__icon">📊</div>
        <div className="empty-state__title">{t.noResults}</div>
        <div className="empty-state__description">
          {locale === 'ja'
            ? '「定量化」タブで解析対象を選択して実行、または計算済みの結果を選択してください'
            : 'Select an analysis target in the "Quantification" tab and run or select a calculated result.'}
        </div>
      </div>
    );
  }

  // Find event names for cutsets
  const eventNameMap = new Map<string, string>();
  const eventProbMap = new Map<string, number>();
  for (const be of model.basicEvents) {
    eventNameMap.set(be.id, be.name);
    eventProbMap.set(be.id, be.probability || 0);
  }
  for (const ie of model.initiatingEvents) {
    eventNameMap.set(ie.id, ie.name);
    eventProbMap.set(ie.id, ie.frequency);
  }

  return (
    <div className="animate-fadeIn" style={{
      display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden'
    }}>
      {/* Summary Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)',
        padding: 'var(--space-md)', flexShrink: 0
      }}>
        <div className="stat-card">
          <div className="stat-card__label">{t.bddExact}</div>
          <div className="stat-card__value">{result.topEventProbability.toExponential(3)}</div>
          <div className="stat-card__sub">
            {t.rareEvent}: {result.topEventProbabilityApprox.toExponential(3)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">{t.totalMCS}</div>
          <div className="stat-card__value" style={{ color: 'var(--accent-amber)' }}>
            {result.cutSets.length.toLocaleString()}
          </div>
          <div className="stat-card__sub">
            Max order: {Math.max(...result.cutSets.map(c => c.order), 0)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">{t.computeTime}</div>
          <div className="stat-card__value" style={{ color: 'var(--accent-cyan)' }}>
            {result.computeTimeMs.toFixed(1)}
          </div>
          <div className="stat-card__sub">ms</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">{locale === 'ja' ? '解析手法 / カットオフ' : 'Method / Cut-off'}</div>
          <div className="stat-card__value" style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>
            {result.method.toUpperCase().replace('_', ' ')}
          </div>
          <div className="stat-card__sub">
            Cut-off: {result.cutoff?.toExponential(1) || 'None'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 var(--space-md)', flexShrink: 0 }}>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'cutsets' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('cutsets')}
          >
            {t.cutsets}
          </button>
          <button
            className={`tab ${activeTab === 'importance' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('importance')}
          >
            {t.importance}
          </button>
          <button
            className={`tab ${activeTab === 'endstates' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('endstates')}
          >
            {t.endstates}
          </button>
          {result.sequenceResults && (
            <button
              className={`tab ${activeTab === 'sequences' ? 'tab--active' : ''}`}
              onClick={() => setActiveTab('sequences')}
            >
              {t.sequences}
            </button>
          )}
          <button
            className={`tab ${activeTab === 'uncertainty' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('uncertainty')}
          >
            {t.uncertainty}
          </button>
          <button
            className={`tab ${activeTab === 'sensitivity' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('sensitivity')}
          >
            {t.sensitivity}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-md)' }}>
        {/* Cutsets Tab */}
        {activeTab === 'cutsets' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ margin: 0 }}>
                  {selectedSeq
                    ? `${t.cutsets} (${selectedSeq.sequenceName})`
                    : `${t.cutsets} (${locale === 'ja' ? '全合計' : 'Total Risk'})`}
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      const csvData = displayedCutsets.map((cs, i) => ({
                        Rank: i + 1,
                        Events: cs.events.join(' | '),
                        Order: cs.order,
                        Probability: cs.probability,
                        Contribution: ((cs.probability / result.topEventProbability) * 100).toFixed(2) + '%'
                      }));
                      downloadFile(jsonToCsv(csvData), `MCS_Export_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
                    }}
                  >
                    📥 CSV
                  </button>
                  {selectedSeq && (
                    <button className="btn btn--ghost btn--sm" onClick={() => setSelectedSeqId(null)}>
                      {locale === 'ja' ? '全合計に戻す' : 'Show Total'}
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {locale === 'ja' ? '表示件数:' : 'Show:'}
                </span>
                <select
                  className="form-select"
                  value={maxCutsets}
                  onChange={(e) => setMaxCutsets(Number(e.target.value))}
                  style={{ width: '80px', padding: '2px 8px', fontSize: '12px' }}
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                </select>
              </div>
            </div>

            <table className="results-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>{t.rank}</th>
                  <th>{t.events}</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>{t.order}</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>{t.probability}</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>{t.contribution}</th>
                </tr>
              </thead>
              <tbody>
                {displayedCutsets.map((cs, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>#{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {cs.events.map((eid, j) => (
                          <span key={j} className="badge badge--neutral" style={{ fontSize: '10px' }}>
                            {eventNameMap.get(eid) || eid}
                            <span style={{ marginLeft: '4px', opacity: 0.6 }}>
                              ({eventProbMap.get(eid)?.toExponential(1) || '?'})
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{cs.order}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                      {cs.probability.toExponential(3)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-amber)' }}>
                      {((cs.probability / result.topEventProbability) * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Importance Tab */}
        {activeTab === 'importance' && (
          <div>
            <div className="tabs" style={{ marginBottom: '16px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['fv', 'raw', 'rrw', 'birnbaum'] as ImportanceTab[]).map(type => (
                  <button
                    key={type}
                    className={`tab tab--sm ${importanceTab === type ? 'tab--active' : ''}`}
                    onClick={() => setImportanceTab(type)}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  const csvData = sortedImportance.map(m => ({
                    EventId: m.eventId,
                    EventName: eventNameMap.get(m.eventId) || m.eventId,
                    FV: m.fv,
                    RAW: m.raw,
                    RRW: m.rrw,
                    Birnbaum: m.birnbaum
                  }));
                  downloadFile(jsonToCsv(csvData), `Importance_Export_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
                }}
              >
                📥 CSV
              </button>
            </div>

            <table className="results-table">
              <thead>
                <tr>
                  <th>{t.eventName}</th>
                  <th style={{ width: '250px' }}>Chart</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {sortedImportance.map((m) => {
                  const val = m[importanceTab];
                  const barWidth = Math.max((val / maxImportanceValue) * 100, 1);
                  return (
                    <tr key={m.eventId}>
                      <td style={{ fontWeight: 500 }}>{eventNameMap.get(m.eventId) || m.eventId}</td>
                      <td>
                        <div style={{ width: '100%', height: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${barWidth}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))',
                            borderRadius: '6px'
                          }} />
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                        {val.toExponential(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* End States Tab */}
        {activeTab === 'endstates' && (
          <div className="animate-fadeIn">
            {/* Category Summary Section */}
            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <h4 style={{ fontSize: '14px', marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
                {locale === 'ja' ? 'カテゴリ別サマリー' : 'Category Summary'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                {Array.from(new Set(model.endStates.flatMap(es => es.categories || []))).sort().map(cat => {
                  const totalFreq = result.endStateResults
                    ?.filter(r => r.category.split(', ').includes(cat))
                    .reduce((sum, r) => sum + r.frequency, 0) || 0;
                  const isZero = totalFreq === 0;

                  return (
                    <div key={cat} className="stat-card" style={{ borderLeft: isZero ? '3px solid var(--border-default)' : '3px solid var(--accent-blue)', opacity: isZero ? 0.6 : 1 }}>
                      <div className="stat-card__label">{cat}</div>
                      <div className="stat-card__value" style={{ fontSize: '16px' }}>
                        {isZero ? (locale === 'ja' ? '対象なし' : 'No Target') : totalFreq.toExponential(2)}
                      </div>
                      <div style={{ width: '100%', height: '4px', background: 'var(--bg-secondary)', marginTop: '8px', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: isZero ? '0%' : '100%', height: '100%', background: 'var(--accent-blue)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <h4 style={{ fontSize: '14px', marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
              {locale === 'ja' ? '終状態詳細' : 'End State Details'}
            </h4>
            <table className="results-table">
              <thead>
                <tr>
                  <th>{t.endStateName}</th>
                  <th>{t.category}</th>
                  <th style={{ textAlign: 'right' }}>{t.frequency}</th>
                  <th style={{ textAlign: 'right' }}>{t.contribution} (CDF)</th>
                </tr>
              </thead>
              <tbody>
                {model.endStates.map((es) => {
                  const esResult = result.endStateResults?.find(r => r.endStateId === es.id);
                  const isZero = !esResult || esResult.frequency === 0;
                  return (
                    <tr key={es.id} style={{ opacity: isZero ? 0.6 : 1 }}>
                      <td style={{ fontWeight: 600 }}>{es.name}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(es.categories || []).map(cat => (
                            <span key={cat} className="badge badge--ghost" style={{ fontSize: '9px' }}>{cat}</span>
                          ))}
                        </div>
                      </td>
                      <td className="td-mono" style={{ textAlign: 'right', color: isZero ? 'var(--text-tertiary)' : 'inherit' }}>
                        {esResult ? esResult.frequency.toExponential(2) : (locale === 'ja' ? '対象なし' : 'No Target')}
                      </td>
                      <td className="td-mono" style={{ textAlign: 'right' }}>
                        {esResult && esResult.cdfContribution > 0
                          ? `${esResult.cdfContribution.toFixed(1)}%`
                          : (isZero ? '—' : '0.0%')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Sequences Tab */}
        {activeTab === 'sequences' && result.sequenceResults && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>{t.sequences}</h3>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  const csvData = result.sequenceResults!.map(seq => {
                    const seqInfo = model.eventTrees.flatMap(et => et.sequences).find((s: any) => s.id === seq.sequenceId);
                    const es = model.endStates.find(e => e.id === seqInfo?.endStateId);
                    return {
                      Name: seq.sequenceName,
                      Path: seq.pathDescription,
                      Frequency: seq.frequency,
                      EndState: es?.name || 'N/A',
                      Category: es?.categories.join(', ') || '-'
                    };
                  });
                  downloadFile(jsonToCsv(csvData), `Sequences_Export_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
                }}
              >
                📥 CSV Download
              </button>
            </div>
            <table className="results-table">
              <thead>
                <tr>
                  <th>{t.sequenceName}</th>
                  <th>{t.path}</th>
                  <th>{locale === 'ja' ? '終状態' : 'End State'}</th>
                  <th>{locale === 'ja' ? 'カテゴリ' : 'Category'}</th>
                  <th style={{ textAlign: 'right' }}>{t.frequency}</th>
                  <th style={{ textAlign: 'center' }}>{t.rank}</th>
                </tr>
              </thead>
              <tbody>
                {(result.sequenceResults || []).map((seq) => {
                  const seqInfo = model.eventTrees.flatMap(et => et.sequences).find((s: any) => s.id === seq.sequenceId);
                  const es = model.endStates.find(e => e.id === seqInfo?.endStateId);

                  return (
                    <tr
                      key={seq.sequenceId}
                      className={selectedSeqId === seq.sequenceId ? 'tr--selected' : ''}
                      onClick={() => {
                        setSelectedSeqId(seq.sequenceId);
                        setActiveTab('cutsets'); // Switch to cutsets to see the result
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{seq.sequenceName}</td>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{seq.pathDescription}</td>
                      <td style={{ fontWeight: 500 }}>{es?.name || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(es?.categories || []).map(cat => (
                            <span key={cat} className="badge badge--ghost" style={{ fontSize: '9px' }}>{cat}</span>
                          ))}
                        </div>
                      </td>
                      <td className="td-mono" style={{ textAlign: 'right' }}>
                        {seq.frequency.toExponential(3)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'var(--accent-blue)', textDecoration: 'underline' }}>
                          {locale === 'ja' ? '詳細分析' : 'Details'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Uncertainty Tab */}
        {activeTab === 'uncertainty' && (
          <UncertaintyPanel locale={locale} />
        )}

        {/* Sensitivity Tab */}
        {activeTab === 'sensitivity' && (
          <SensitivityPanel locale={locale} />
        )}
      </div>
    </div>
  );
}
