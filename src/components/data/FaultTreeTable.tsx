'use client';

import React, { useState } from 'react';
import { useModelStore } from '@/store/modelStore';
import type { FaultTree } from '@/lib/types';
import { useTableSort } from '@/lib/hooks/useTableSort';

interface FaultTreeTableProps {
  locale?: 'ja' | 'en';
  onOpenFT?: (ftId: string) => void;
}

export default function FaultTreeTable({ locale = 'ja', onOpenFT }: FaultTreeTableProps) {
  const model = useModelStore((s) => s.model);
  const addFaultTree = useModelStore((s) => s.addFaultTree);
  const updateFaultTree = useModelStore((s) => s.updateFaultTree);
  const removeFaultTree = useModelStore((s) => s.removeFaultTree);
  
  const [searchTerm, setSearchTerm] = useState('');

  const rawTrees = (model.faultTrees || []).filter(ft => 
    ft.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { items: sortedTrees, requestSort, sortConfig } = useTableSort<FaultTree>(rawTrees, 'name');

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return ' ↕️';
    return sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽';
  };

  const handleAdd = () => {
    const name = locale === 'ja' ? '新しいFault Tree' : 'New Fault Tree';
    addFaultTree(name);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input 
          className="form-input" 
          placeholder={locale === 'ja' ? 'Fault Treeを検索...' : 'Search fault trees...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
        <button className="btn btn--primary" onClick={handleAdd}>
          + {locale === 'ja' ? 'Fault Treeを追加' : 'Add Fault Tree'}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="results-table">
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th style={{ width: '200px', cursor: 'pointer' }} onClick={() => requestSort('name')}>
                {locale === 'ja' ? 'ツリー名' : 'Tree Name'}{getSortIcon('name')}
              </th>
              <th style={{ width: '120px', cursor: 'pointer' }} onClick={() => requestSort('topGateId')}>
                {locale === 'ja' ? 'トップゲートID' : 'Top Gate ID'}{getSortIcon('topGateId')}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('gates')}>
                {locale === 'ja' ? 'ゲート数' : 'Gate Count'}{getSortIcon('gates')}
              </th>
              <th style={{ width: '140px' }}>{locale === 'ja' ? '操作' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {sortedTrees.map((ft) => (
              <tr key={ft.id}>
                <td>
                  <input 
                    className="form-input" 
                    value={ft.name} 
                    onChange={(e) => updateFaultTree(ft.id, { name: e.target.value })}
                    style={{ background: 'transparent', border: 'none', padding: '2px 4px', fontWeight: 600 }}
                  />
                </td>
                <td style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  {ft.topGateId?.substring(0, 8) || '-'}
                </td>
                <td style={{ fontSize: '13px' }}>
                  {(ft.gates || []).length} gates
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn--secondary btn--sm" 
                      onClick={() => onOpenFT?.(ft.id)}
                      title={locale === 'ja' ? 'エディタで開く' : 'Open in Editor'}
                      style={{ fontSize: '12px' }}
                    >
                      👁️ {locale === 'ja' ? '開く' : 'Open'}
                    </button>
                    <button 
                      className="btn btn--ghost btn--sm" 
                      onClick={() => {
                        if (window.confirm(locale === 'ja' ? `${ft.name} を削除しますか？` : `Delete ${ft.name}?`)) {
                          removeFaultTree(ft.id);
                        }
                      }}
                      style={{ color: 'var(--accent-red)' }}
                      title={locale === 'ja' ? '削除' : 'Delete'}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
