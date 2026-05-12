'use client';

import React, { useState } from 'react';
import { useModelStore } from '@/store/modelStore';
import type { InitiatingEvent } from '@/lib/types';
import { useTableSort } from '@/lib/hooks/useTableSort';

interface InitiatingEventTableProps {
  locale?: 'ja' | 'en';
}

export default function InitiatingEventTable({ locale = 'ja' }: InitiatingEventTableProps) {
  const model = useModelStore((s) => s.model);
  const updateInitiatingEvent = useModelStore((s) => s.updateInitiatingEvent);
  const addInitiatingEvent = useModelStore((s) => s.addInitiatingEvent);
  const removeInitiatingEvent = useModelStore((s) => s.removeInitiatingEvent);
  const [searchTerm, setSearchTerm] = useState('');

  const baseFilteredIEs = (model.initiatingEvents || []).filter(ie => 
    ie.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ie.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ie.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { items: filteredIEs, requestSort, sortConfig } = useTableSort<InitiatingEvent>(baseFilteredIEs, 'code');

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return ' ↕️';
    return sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <input 
          className="form-input" 
          placeholder={locale === 'ja' ? '起因事象を検索...' : 'Search initiating events...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
        <button
          className="btn btn-primary"
          onClick={() => {
            const newId = `IE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            addInitiatingEvent({
              id: newId,
              code: 'NEW-IE',
              name: locale === 'ja' ? '新規起因事象' : 'New Initiating Event',
              frequency: 1.0,
              description: '',
              distribution: { type: 'point' }
            });
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {locale === 'ja' ? '起因事象を追加' : 'Add Initiating Event'}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="results-table">
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('id')}>{locale === 'ja' ? 'ID' : 'ID'}{getSortIcon('id')}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('code')}>{locale === 'ja' ? 'コード' : 'Code'}{getSortIcon('code')}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('name')}>{locale === 'ja' ? '名称' : 'Name'}{getSortIcon('name')}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('frequency')}>{locale === 'ja' ? '頻度 [/yr]' : 'Frequency [/yr]'}{getSortIcon('frequency')}</th>
              <th>{locale === 'ja' ? '分布' : 'Dist.'}</th>
              <th>{locale === 'ja' ? '不確かさ' : 'Uncertainty'}</th>
              <th>{locale === 'ja' ? 'リンク済みFT' : 'Linked FT'}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('description')}>{locale === 'ja' ? '説明' : 'Description'}{getSortIcon('description')}</th>
              <th style={{ width: '60px', textAlign: 'center' }}>{locale === 'ja' ? '操作' : 'Action'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredIEs.map((ie) => (
              <tr key={ie.id}>
                <td className="td-mono" style={{ fontSize: '11px' }}>{ie.id}</td>
                <td>
                  <input 
                    className="form-input td-mono" 
                    value={ie.code || ''} 
                    onChange={(e) => updateInitiatingEvent(ie.id, { code: e.target.value })}
                    style={{ background: 'transparent', border: 'none', padding: '2px 4px' }}
                  />
                </td>
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
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => {
                      if (confirm(locale === 'ja' ? `起因事象 "${ie.name}" を削除しますか？` : `Are you sure you want to delete initiating event "${ie.name}"?`)) {
                        removeInitiatingEvent(ie.id);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-danger, #FF4757)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={locale === 'ja' ? '削除' : 'Delete'}
                  >
                    <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
