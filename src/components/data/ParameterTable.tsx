'use client';

import React, { useState } from 'react';
import { useModelStore } from '@/store/modelStore';
import type { Parameter } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { useTableSort } from '@/lib/hooks/useTableSort';

export default function ParameterTable({ locale = 'ja' }: { locale?: 'ja' | 'en' }) {
  const model = useModelStore((s) => s.model);
  const addParameter = useModelStore((s) => s.addParameter);
  const updateParameter = useModelStore((s) => s.updateParameter);
  const removeParameter = useModelStore((s) => s.removeParameter);
  const [searchTerm, setSearchTerm] = useState('');

  const handleAdd = () => {
    const newId = uuidv4();
    const newParam: Parameter = {
      id: newId,
      name: locale === 'ja' ? '新規パラメータ' : 'New Parameter',
      failureType: 'time',
      value: 1e-4,
      source: '',
      description: '',
    };
    addParameter(newParam);
  };

  const handleDelete = (id: string) => {
    // 参照チェック
    const isReferenced = model.basicEvents.some((be) => be.parameterId === id);
    if (isReferenced) {
      alert(locale === 'ja' ? 'このパラメータは基事象から参照されているため削除できません。' : 'Cannot delete this parameter because it is referenced by basic events.');
      return;
    }

    if (confirm(locale === 'ja' ? 'このパラメータを削除しますか？' : 'Delete this parameter?')) {
      removeParameter(id);
    }
  };

  const baseFilteredParams = (model.parameters || []).filter((p) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { items: filteredParams, requestSort, sortConfig } = useTableSort<Parameter>(baseFilteredParams, 'name');

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return ' ↕️';
    return sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽';
  };

  return (
    <div style={{ padding: 'var(--space-lg)', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>
          {locale === 'ja' ? '故障率データ (Parameter)' : 'Failure Rate Data (Parameter)'}
          <span className="badge badge--success" style={{ marginLeft: '12px' }}>
            {(model.parameters || []).length}
          </span>
        </h2>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder={locale === 'ja' ? '検索...' : 'Search...'} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '250px' }}
          />
          <button className="btn btn--primary" onClick={handleAdd}>
            + {locale === 'ja' ? '新規作成' : 'Add New'}
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
        <table className="results-table">
          <thead>
            <tr>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('name')}>{locale === 'ja' ? 'パラメータ名' : 'Name'}{getSortIcon('name')}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('failureType')}>{locale === 'ja' ? 'タイプ' : 'Type'}{getSortIcon('failureType')}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('value')}>{locale === 'ja' ? '値 (故障率/確率)' : 'Value'}{getSortIcon('value')}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('source')}>{locale === 'ja' ? '参照元' : 'Source'}{getSortIcon('source')}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('description')}>{locale === 'ja' ? '説明' : 'Description'}{getSortIcon('description')}</th>
              <th>{locale === 'ja' ? '操作' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredParams.map((p) => (
              <tr key={p.id}>
                <td>
                  <input
                    className="form-input"
                    style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent' }}
                    value={p.name}
                    onChange={(e) => updateParameter({ ...p, name: e.target.value })}
                  />
                </td>
                <td>
                  <select
                    className="form-select"
                    style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent' }}
                    value={p.failureType}
                    onChange={(e) => updateParameter({ ...p, failureType: e.target.value as 'time' | 'demand' })}
                  >
                    <option value="time">{locale === 'ja' ? '時間 (/hr)' : 'Time (/hr)'}</option>
                    <option value="demand">{locale === 'ja' ? 'デマンド (/d)' : 'Demand (/d)'}</option>
                  </select>
                </td>
                <td>
                  <input
                    className="form-input form-input--mono"
                    type="number"
                    step="any"
                    style={{ width: '120px', padding: '4px 8px', fontSize: '11px', background: 'transparent' }}
                    value={p.value}
                    onChange={(e) => updateParameter({ ...p, value: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td>
                  <input
                    className="form-input"
                    style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent' }}
                    value={p.source ?? ''}
                    onChange={(e) => updateParameter({ ...p, source: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="form-input"
                    style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent' }}
                    value={p.description ?? ''}
                    onChange={(e) => updateParameter({ ...p, description: e.target.value })}
                  />
                </td>
                <td>
                  <button 
                    className="btn btn--danger btn--sm" 
                    onClick={() => handleDelete(p.id)}
                    style={{ padding: '2px 6px', fontSize: '10px' }}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
            {filteredParams.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-tertiary)' }}>
                  {locale === 'ja' ? 'データがありません' : 'No data available'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
