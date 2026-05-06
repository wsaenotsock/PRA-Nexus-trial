'use client';

import React, { useState } from 'react';
import { useModelStore } from '@/store/modelStore';
import type { InitiatingEvent } from '@/lib/types';

interface InitiatingEventTableProps {
  locale?: 'ja' | 'en';
}

export default function InitiatingEventTable({ locale = 'ja' }: InitiatingEventTableProps) {
  const model = useModelStore((s) => s.model);
  const updateInitiatingEvent = useModelStore((s) => s.updateInitiatingEvent);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIEs = (model.initiatingEvents || []).filter(ie => 
    ie.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ie.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-default)', display: 'flex', gap: '16px' }}>
        <input 
          className="form-input" 
          placeholder={locale === 'ja' ? '起因事象を検索...' : 'Search initiating events...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="results-table">
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
               <th>{locale === 'ja' ? 'ID' : 'ID'}</th>
              <th>{locale === 'ja' ? '名称' : 'Name'}</th>
              <th>{locale === 'ja' ? '頻度 [/yr]' : 'Frequency [/yr]'}</th>
              <th>{locale === 'ja' ? '分布' : 'Dist.'}</th>
              <th>{locale === 'ja' ? '不確かさ' : 'Uncertainty'}</th>
              <th>{locale === 'ja' ? 'リンク済みFT' : 'Linked FT'}</th>
              <th>{locale === 'ja' ? '説明' : 'Description'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredIEs.map((ie) => (
              <tr key={ie.id}>
                <td className="td-mono" style={{ fontSize: '11px' }}>{ie.id}</td>
                <td>
                  <input 
                    className="form-input" 
                    value={ie.name} 
                    onChange={(e) => updateInitiatingEvent(ie.id, { name: e.target.value })}
                    style={{ background: 'transparent', border: 'none', padding: '2px 4px' }}
                  />
                </td>
                <td>
                  <input 
                    className="form-input td-mono" 
                    type="number"
                    step="1e-6"
                    value={ie.frequency} 
                    onChange={(e) => updateInitiatingEvent(ie.id, { frequency: parseFloat(e.target.value) || 0 })}
                    style={{ background: 'transparent', border: 'none', padding: '2px 4px' }}
                    disabled={!!ie.linkedFaultTreeId}
                  />
                </td>
                <td>
                  <select
                    className="form-select"
                    style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent' }}
                    value={ie.distribution?.type || 'point'}
                    onChange={(e) => {
                      updateInitiatingEvent(ie.id, {
                        distribution: {
                          ...ie.distribution,
                          type: e.target.value as any
                        }
                      });
                    }}
                  >
                    <option value="point">{locale === 'ja' ? '点推定' : 'Point'}</option>
                    <option value="lognormal">{locale === 'ja' ? '対数正規' : 'Lognormal'}</option>
                    <option value="normal">{locale === 'ja' ? '正規' : 'Normal'}</option>
                    <option value="uniform">{locale === 'ja' ? '一様' : 'Uniform'}</option>
                  </select>
                </td>
                <td>
                  {ie.distribution?.type === 'lognormal' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>EF:</span>
                      <input
                        type="number"
                        step="0.1"
                        className="form-input td-mono"
                        style={{ padding: '2px 4px', fontSize: '10px', width: '45px', height: '24px' }}
                        value={(ie.distribution as any).errorFactor || 3}
                        onChange={(e) => updateInitiatingEvent(ie.id, { distribution: { ...ie.distribution, errorFactor: parseFloat(e.target.value) } as any })}
                      />
                    </div>
                  ) : ie.distribution?.type === 'normal' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>SD:</span>
                      <input
                        type="number"
                        className="form-input td-mono"
                        style={{ padding: '2px 4px', fontSize: '10px', width: '45px', height: '24px' }}
                        value={(ie.distribution as any).stdDev || 0}
                        onChange={(e) => updateInitiatingEvent(ie.id, { distribution: { ...ie.distribution, stdDev: parseFloat(e.target.value) } as any })}
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>-</span>
                  )}
                </td>
                <td>
                  <select
                    className="form-select"
                    value={ie.linkedFaultTreeId || ''}
                    onChange={(e) => updateInitiatingEvent(ie.id, { linkedFaultTreeId: e.target.value })}
                    style={{ background: 'transparent', border: 'none', padding: '2px 4px', fontSize: '11px' }}
                  >
                    <option value="">None</option>
                    {model.faultTrees?.map(ft => (
                      <option key={ft.id} value={ft.id}>{ft.name}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input 
                    className="form-input" 
                    value={ie.description || ''} 
                    onChange={(e) => updateInitiatingEvent(ie.id, { description: e.target.value })}
                    style={{ background: 'transparent', border: 'none', padding: '2px 4px' }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
