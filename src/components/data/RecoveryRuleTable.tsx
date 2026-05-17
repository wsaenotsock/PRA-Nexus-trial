'use client';

import React, { useState } from 'react';
import { useModelStore } from '@/store/modelStore';
import type { RecoveryRule, RecoveryAction } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface RecoveryRuleTableProps {
  locale?: 'ja' | 'en';
  highlightedId?: string | null;
}

export default function RecoveryRuleTable({ locale = 'ja', highlightedId }: RecoveryRuleTableProps) {
  const model = useModelStore((s) => s.model);
  const addRecoveryRule = useModelStore((s) => s.addRecoveryRule);
  const updateRecoveryRule = useModelStore((s) => s.updateRecoveryRule);
  const removeRecoveryRule = useModelStore((s) => s.removeRecoveryRule);
  
  const [searchTerm, setSearchTerm] = useState('');

  const rules = model.recoveryRules || [];
  const filteredRules = rules.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.condition.join(',').toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.priority - a.priority);

  const handleAddRule = () => {
    const newRule: RecoveryRule = {
      id: uuidv4(),
      name: locale === 'ja' ? '新規リカバリールール' : 'New Recovery Rule',
      condition: [],
      action: 'add',
      priority: 10
    };
    addRecoveryRule(newRule);
  };

  const handleToggleCondition = (ruleId: string, eventId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    
    const newCondition = rule.condition.includes(eventId)
      ? rule.condition.filter(id => id !== eventId)
      : [...rule.condition, eventId];
      
    updateRecoveryRule(ruleId, { condition: newCondition });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <input 
          className="form-input" 
          placeholder={locale === 'ja' ? 'ルールを検索...' : 'Search rules...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
        <button
          className="btn btn-primary"
          onClick={handleAddRule}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {locale === 'ja' ? 'ルールを追加' : 'Add Recovery Rule'}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="results-table">
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th style={{ width: '200px' }}>{locale === 'ja' ? '名称' : 'Name'}</th>
              <th>{locale === 'ja' ? '条件 (AND)' : 'Condition (AND)'}</th>
              <th style={{ width: '120px' }}>{locale === 'ja' ? 'アクション' : 'Action'}</th>
              <th style={{ width: '150px' }}>{locale === 'ja' ? '対象事象' : 'Target Event'}</th>
              <th style={{ width: '100px' }}>{locale === 'ja' ? '確率' : 'Prob.'}</th>
              <th style={{ width: '80px' }}>{locale === 'ja' ? '優先度' : 'Priority'}</th>
              <th style={{ width: '60px', textAlign: 'center' }}>{locale === 'ja' ? '操作' : 'Action'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRules.map((rule) => {
              const isHighlighted = highlightedId ? (
                rule.id === highlightedId ||
                rule.condition.includes(highlightedId) ||
                rule.targetEventId === highlightedId ||
                model.basicEvents.find(be => be.id === highlightedId)?.eventId === rule.targetEventId ||
                rule.condition.some(cid => model.basicEvents.find(be => be.id === cid)?.eventId === highlightedId)
              ) : false;
              return (
                <tr key={rule.id} style={{ 
                  background: isHighlighted ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                  transition: 'background 0.3s ease'
                }}>
                <td>
                  <input 
                    className="form-input" 
                    value={rule.name} 
                    onChange={(e) => updateRecoveryRule(rule.id, { name: e.target.value })}
                    style={{ background: 'transparent', border: 'none', padding: '2px 4px', fontWeight: 600 }}
                  />
                </td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', minHeight: '32px', alignItems: 'center' }}>
                    {rule.condition.map(cid => (
                      <span 
                        key={cid} 
                        style={{ 
                          background: 'var(--accent-blue-alpha)', 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {model.basicEvents.find(be => be.id === cid)?.name || cid}
                        <span 
                          style={{ cursor: 'pointer', opacity: 0.6 }} 
                          onClick={() => handleToggleCondition(rule.id, cid)}
                        >×</span>
                      </span>
                    ))}
                    <select
                      className="form-select"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) handleToggleCondition(rule.id, e.target.value);
                      }}
                      style={{ width: '120px', padding: '2px 4px', fontSize: '11px', border: '1px dashed var(--border-default)', background: 'transparent' }}
                    >
                      <option value="">+ {locale === 'ja' ? '事象を追加' : 'Add Event'}</option>
                      {model.basicEvents
                        .filter(be => !rule.condition.includes(be.id))
                        .map(be => (
                          <option key={be.id} value={be.id}>{be.name}</option>
                        ))
                      }
                    </select>
                  </div>
                </td>
                <td>
                  <select
                    className="form-select"
                    value={rule.action}
                    onChange={(e) => updateRecoveryRule(rule.id, { action: e.target.value as RecoveryAction })}
                    style={{ background: 'transparent', border: 'none', padding: '2px 4px', fontSize: '11px' }}
                  >
                    <option value="add">{locale === 'ja' ? '追加 (Add)' : 'Add'}</option>
                    <option value="remove">{locale === 'ja' ? '削除 (Remove)' : 'Remove'}</option>
                    <option value="replace">{locale === 'ja' ? '置換 (Replace)' : 'Replace'}</option>
                    <option value="set_probability">{locale === 'ja' ? '確率設定' : 'Set Prob'}</option>
                  </select>
                </td>
                <td>
                  {rule.action !== 'remove' && rule.action !== 'set_probability' ? (
                    <select
                      className="form-select"
                      value={rule.targetEventId || ''}
                      onChange={(e) => updateRecoveryRule(rule.id, { targetEventId: e.target.value })}
                      style={{ background: 'transparent', border: 'none', padding: '2px 4px', fontSize: '11px' }}
                    >
                      <option value="">{locale === 'ja' ? '未選択' : 'None'}</option>
                      {model.basicEvents.map(be => (
                        <option key={be.id} value={be.id}>{be.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>N/A</span>
                  )}
                </td>
                <td>
                  <input 
                    className="form-input td-mono" 
                    type="number"
                    step="0.01"
                    value={rule.probability ?? ''} 
                    onChange={(e) => updateRecoveryRule(rule.id, { probability: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="1.0"
                    style={{ background: 'transparent', border: 'none', padding: '2px 4px', width: '100%' }}
                  />
                </td>
                <td>
                  <input 
                    className="form-input td-mono" 
                    type="number"
                    value={rule.priority} 
                    onChange={(e) => updateRecoveryRule(rule.id, { priority: parseInt(e.target.value) || 0 })}
                    style={{ background: 'transparent', border: 'none', padding: '2px 4px', width: '100%' }}
                  />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => {
                      if (confirm(locale === 'ja' ? `ルール "${rule.name}" を削除しますか？` : `Delete rule "${rule.name}"?`)) {
                        removeRecoveryRule(rule.id);
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-danger)', cursor: 'pointer', padding: '4px' }}
                  >
                    <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
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
