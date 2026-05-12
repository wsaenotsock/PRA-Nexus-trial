'use client';

import React, { useState, useMemo } from 'react';
import { useModelStore } from '@/store/modelStore';
import type { EndState } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { useTableSort } from '@/lib/hooks/useTableSort';

interface EndStateTableProps {
  locale?: 'ja' | 'en';
}

interface CategoryInputProps {
  value: string[];
  onChange: (cats: string[]) => void;
  locale: 'ja' | 'en';
  suggestions: string[];
}

function CategoryInput({ value, onChange, locale, suggestions }: CategoryInputProps) {
  const [localValue, setLocalValue] = useState(value.join(', '));
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const joined = value.join(', ');
    if (joined !== localValue && document.activeElement !== inputRef.current) {
      setLocalValue(joined);
    }
  }, [value, localValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    const cats = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
    onChange(cats);
  };

  const handleToggleCategory = (cat: string) => {
    let newCats;
    if (value.includes(cat)) {
      newCats = value.filter(c => c !== cat);
    } else {
      newCats = [...value, cat];
    }
    onChange(newCats);
    setLocalValue(newCats.join(', '));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px 0' }}>
      <input
        ref={inputRef}
        className="form-input"
        value={localValue}
        onChange={handleChange}
        onBlur={() => setLocalValue(value.join(', '))}
        style={{ background: 'transparent', border: 'none', padding: '2px 4px', width: '100%' }}
        placeholder={locale === 'ja' ? 'カテゴリ (カンマ区切り)...' : 'Categories (comma separated)...'}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {suggestions.map(cat => (
          <button 
            key={cat}
            type="button"
            onClick={() => handleToggleCategory(cat)}
            style={{
              fontSize: '9px',
              padding: '1px 6px',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              background: value.includes(cat) ? 'var(--accent-green)' : 'var(--bg-tertiary)',
              color: value.includes(cat) ? 'white' : 'var(--text-muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {cat === 'success' ? (locale === 'ja' ? '成功' : 'success') : 
             cat === 'core_damage' ? (locale === 'ja' ? '炉心損傷' : 'core_damage') : cat}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function EndStateTable({ locale = 'ja' }: EndStateTableProps) {
  const model = useModelStore((s) => s.model);
  const addEndState = useModelStore((s) => s.addEndState);
  const updateEndState = useModelStore((s) => s.updateEndState);
  const removeEndState = useModelStore((s) => s.removeEndState);
  
  const [searchTerm, setSearchTerm] = useState('');

  const rawFiltered = (model.endStates || []).filter(es => 
    es.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (es.categories || []).some(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const { items: filteredEndStates, requestSort, sortConfig } = useTableSort<EndState>(rawFiltered, 'name');

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return ' ↕️';
    return sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽';
  };

  const allCategories = (model.endStates || []).flatMap(es => es.categories || []);
  const existingCategories = Array.from(new Set(allCategories));
  if (!existingCategories.includes('success')) existingCategories.push('success');
  if (!existingCategories.includes('core_damage')) existingCategories.push('core_damage');

  const handleAdd = () => {
    const newES: EndState = {
      id: uuidv4(),
      name: locale === 'ja' ? '新しい終状態' : 'New End State',
      categories: ['core_damage'],
      color: '#FF4757'
    };
    addEndState(newES);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input 
          className="form-input" 
          placeholder={locale === 'ja' ? '終状態を検索...' : 'Search end states...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
        <button className="btn btn--primary" onClick={handleAdd}>
          + {locale === 'ja' ? '終状態を追加' : 'Add End State'}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="results-table">
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th style={{ width: '120px', cursor: 'pointer' }} onClick={() => requestSort('name')}>
                {locale === 'ja' ? '名称' : 'Name'}{getSortIcon('name')}
              </th>
              <th style={{ width: '180px', cursor: 'pointer' }} onClick={() => requestSort('categories')}>
                {locale === 'ja' ? 'カテゴリ' : 'Category'}{getSortIcon('categories')}
              </th>
              <th style={{ width: '80px' }}>{locale === 'ja' ? '色' : 'Color'}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => requestSort('description')}>
                {locale === 'ja' ? '説明' : 'Description'}{getSortIcon('description')}
              </th>
              <th style={{ width: '80px' }}>{locale === 'ja' ? '操作' : 'Action'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredEndStates.map((es) => (
              <tr key={es.id}>
                <td>
                  <input 
                    className="form-input" 
                    value={es.name} 
                    onChange={(e) => updateEndState({ ...es, name: e.target.value })}
                    style={{ background: 'transparent', border: 'none', padding: '2px 4px', fontWeight: 600 }}
                  />
                </td>
                <td>
                  <CategoryInput 
                    value={es.categories || []} 
                    onChange={(cats) => updateEndState({ ...es, categories: cats })}
                    locale={locale}
                    suggestions={existingCategories}
                  />
                </td>
                <td>
                  <input 
                    type="color" 
                    value={es.color || '#cccccc'} 
                    onChange={(e) => updateEndState({ ...es, color: e.target.value })}
                    style={{ width: '30px', height: '24px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                  />
                </td>
                <td>
                  <input 
                    className="form-input" 
                    value={es.description || ''} 
                    onChange={(e) => updateEndState({ ...es, description: e.target.value })}
                    style={{ background: 'transparent', border: 'none', padding: '2px 4px', width: '100%' }}
                  />
                </td>
                <td>
                  <button 
                    className="btn btn--ghost btn--sm" 
                    onClick={() => removeEndState(es.id)}
                    style={{ color: 'var(--accent-red)' }}
                    title={locale === 'ja' ? '削除' : 'Delete'}
                  >
                    🗑️
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
