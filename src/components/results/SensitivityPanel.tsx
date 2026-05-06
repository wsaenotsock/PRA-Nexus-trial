'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useResultsStore, runWorkerCommand } from '@/store/resultsStore';
import { SensitivityOptions, SensitivityPoint } from '@/engine/sensitivity';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell 
} from 'recharts';

interface SensitivityPanelProps {
  locale?: 'ja' | 'en';
}

export default function SensitivityPanel({ locale = 'ja' }: SensitivityPanelProps) {
  const results = useResultsStore((s) => s.results);
  const activeResultId = useResultsStore((s) => s.activeResultId);
  const result = activeResultId ? results[activeResultId] : null;
  const [factor, setFactor] = useState<number>(10);
  const [topN, setTopN] = useState<number>(20);
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [sensitivityData, setSensitivityData] = useState<any[] | null>(null);

  useEffect(() => {
    if (!result || !result.baseProbabilities || !result.importanceMeasures) return;
    
    let isMounted = true;
    const computeSensitivity = async () => {
      setIsComputing(true);
      try {
        const targets = result.importanceMeasures!.slice(0, topN);
        const options: SensitivityOptions = { variationType: 'factor', factor };
        
        const rawData = await runWorkerCommand<SensitivityPoint[]>('RUN_SENSITIVITY', {
          targetEvents: targets,
          options
        });

        if (isMounted) {
          setSensitivityData(rawData.map(d => ({
            name: d.eventName,
            eventId: d.eventId,
            range: [d.topProbLow, d.topProbHigh],
            low: d.topProbLow,
            high: d.topProbHigh,
            base: d.topProbBase,
            baseProb: d.baseProb,
            swing: d.swing
          })));
        }
      } catch (e) {
        console.error('Sensitivity Error:', e);
      } finally {
        if (isMounted) setIsComputing(false);
      }
    };

    computeSensitivity();

    return () => { isMounted = false; };
  }, [result, factor, topN]);

  if (!result || !result.baseProbabilities) {
    return (
      <div className="empty-state" style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>
        {locale === 'ja' 
          ? '感度解析はこの定量化結果（BDDまたは基本確率の欠如）ではサポートされていません。' 
          : 'Sensitivity analysis is not supported for this result type.'}
      </div>
    );
  }

  const baseLine = result.topEventProbability;
  
  // Custom tooltip to show details
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: 'rgba(20, 20, 25, 0.95)', border: '1px solid var(--border-default)', padding: '12px', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: 'var(--text-primary)' }}>{data.name}</p>
          <p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>
            {locale === 'ja' ? '基本確率:' : 'Base Prob:'} <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{data.baseProb.toExponential(3)}</span>
          </p>
          <div style={{ borderTop: '1px dashed var(--border-default)', margin: '8px 0' }} />
          <p style={{ margin: '4px 0', color: 'var(--accent-blue)' }}>
            {locale === 'ja' ? '確率低下時 (1/F):' : 'Low Prob (1/F):'} <span style={{ fontFamily: 'monospace' }}>{data.low.toExponential(3)}</span>
          </p>
          <p style={{ margin: '4px 0', color: 'var(--accent-red)' }}>
            {locale === 'ja' ? '確率上昇時 (F倍):' : 'High Prob (Fx):'} <span style={{ fontFamily: 'monospace' }}>{data.high.toExponential(3)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      {/* Controls */}
      <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-default)', display: 'flex', gap: '24px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>{locale === 'ja' ? '変動ファクター (F):' : 'Variation Factor (F):'}</label>
          <select 
            className="form-select" 
            value={factor} 
            onChange={(e) => setFactor(Number(e.target.value))}
            style={{ width: '80px', padding: '4px 8px', fontSize: '12px' }}
          >
            <option value={2}>2x</option>
            <option value={3}>3x</option>
            <option value={5}>5x</option>
            <option value={10}>10x</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>{locale === 'ja' ? '表示件数:' : 'Show Top N:'}</label>
          <select 
            className="form-select" 
            value={topN} 
            onChange={(e) => setTopN(Number(e.target.value))}
            style={{ width: '80px', padding: '4px 8px', fontSize: '12px' }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
          {locale === 'ja' 
            ? '各基事象の確率を 1/F から F倍 まで変化させた際の、合計リスクの変動幅（スイング）を表示します。' 
            : 'Shows the swing in total risk when varying each basic event probability from 1/F to F times.'}
        </div>
      </div>

        {/* Tornado Chart */}
      {isComputing ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          {locale === 'ja' ? '計算中...' : 'Computing...'}
        </div>
      ) : sensitivityData && sensitivityData.length > 0 ? (
        <div style={{ flex: 1, background: 'var(--bg-canvas)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '14px' }}>
            {locale === 'ja' ? '感度解析トルネードチャート' : 'Sensitivity Tornado Chart'}
          </h4>
          <ResponsiveContainer width="100%" height={Math.max(400, sensitivityData.length * 30)}>
            <BarChart
              data={sensitivityData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                type="number" 
                domain={['auto', 'auto']} 
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickFormatter={(val) => val.toExponential(1)}
                label={{ value: locale === 'ja' ? 'リスク (頻度/確率)' : 'Risk (Frequency/Prob)', position: 'insideBottom', offset: -10, fill: 'var(--text-secondary)', fontSize: 11 }}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                tick={{ fill: 'var(--text-primary)', fontSize: 11 }} 
                width={150} 
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              
              <ReferenceLine 
                x={baseLine} 
                stroke="var(--accent-amber)" 
                strokeDasharray="5 5" 
                label={{ position: 'top', value: locale === 'ja' ? '基本値' : 'Base', fill: 'var(--accent-amber)', fontSize: 10 }} 
              />

              <Bar dataKey="range" barSize={16} radius={[2, 2, 2, 2]}>
                {sensitivityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="url(#colorGradient)" opacity={0.8} />
                ))}
              </Bar>
              
              {/* Define a gradient for the bar */}
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--accent-blue)" />
                  <stop offset="100%" stopColor="var(--accent-red)" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          {locale === 'ja' ? '解析対象データがありません' : 'No data to analyze'}
        </div>
      )}
    </div>
  );
}
