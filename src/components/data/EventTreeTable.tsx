'use client';

import React, { useState, useMemo } from 'react';
import { useModelStore } from '@/store/modelStore';
import { useTableSort } from '@/lib/hooks/useTableSort';

interface EventTreeTableProps {
  locale?: 'ja' | 'en';
  onOpenET?: (etId: string) => void;
}

export default function EventTreeTable({ locale = 'ja', onOpenET }: EventTreeTableProps) {
  const model = useModelStore((s) => s.model);
  const addEventTree = useModelStore((s) => s.addEventTree);
  const updateEventTree = useModelStore((s) => s.updateEventTree);
  const removeEventTree = useModelStore((s) => s.removeEventTree);
  
  const [searchTerm, setSearchTerm] = useState('');

  // Augment EventTree with derived values for consistent sorting
  const augmentedTrees = useMemo(() => {
    return (model.eventTrees || []).map(et => {
      const ie = model.initiatingEvents?.find(i => i.id === et.initiatingEventId);
      return {
        ...et,
        _ieName: ie ? ie.name : '',
        _seqCount: (et.sequences || []).length
      };
    }).filter(et => 
      et.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [model.eventTrees, model.initiatingEvents, searchTerm]);

  const { items: sortedTrees, requestSort, sortConfig } = useTableSort<any>(augmentedTrees, 'name');

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return ' ↕️';
    return sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽';
  };

  const handleAdd = () => {
    const name = locale === 'ja' ? '新しいEvent Tree' : 'New Event Tree';
    const ieId = model.initiatingEvents?.[0]?.id || crypto.randomUUID();
    addEventTree(name, ieId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input 
          className="form-input" 
          placeholder={locale === 'ja' ? 'Event Treeを検索...' : 'Search event trees...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
        <button className="btn btn--primary" onClick={handleAdd}>
          + {locale === 'ja' ? 'Event Treeを追加' : 'Add Event Tree'}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="results-table">
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th style={{ width: '200px', cursor: 'pointer' }} onClick={() => requestSort('name')}>
                {locale === 'ja' ? 'ツリー名' : 'Tree Name'}{getSortIcon('name')}
              </th>
              <th style={{ width: '160px', cursor: 'pointer' }} onClick={() => requestSort('_ieName')}>
                {locale === 'ja' ? '起因事象' : 'Initiating Event'}{getSortIcon('_ieName')}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('_seqCount')}>
                {locale === 'ja' ? 'シーケンス数' : 'Sequences'}{getSortIcon('_seqCount')}
              </th>
              <th style={{ width: '140px' }}>{locale === 'ja' ? '操作' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {sortedTrees.map((et: any) => {
              return (
                <tr key={et.id}>
                  <td>
                    <input 
                      className="form-input" 
                      value={et.name} 
                      onChange={(e) => updateEventTree(et.id, { name: e.target.value })}
                      style={{ background: 'transparent', border: 'none', padding: '2px 4px', fontWeight: 600 }}
                    />
                  </td>
                  <td style={{ fontSize: '13px' }}>
                    {et._ieName || <span style={{ color: 'var(--text-muted)' }}>-</span>}
                  </td>
                  <td style={{ fontSize: '13px' }}>
                    {et._seqCount} seqs
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn--secondary btn--sm" 
                        onClick={() => onOpenET?.(et.id)}
                        title={locale === 'ja' ? 'エディタで開く' : 'Open in Editor'}
                        style={{ fontSize: '12px' }}
                      >
                        👁️ {locale === 'ja' ? '開く' : 'Open'}
                      </button>
                      <button 
                        className="btn btn--ghost btn--sm" 
                        onClick={() => {
                          if (window.confirm(locale === 'ja' ? `${et.name} を削除しますか？` : `Delete ${et.name}?`)) {
                            removeEventTree(et.id);
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
