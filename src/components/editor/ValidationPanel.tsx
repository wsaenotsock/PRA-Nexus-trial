import React, { useMemo } from 'react';
import { useModelStore } from '@/store/modelStore';

interface ValidationPanelProps {
  locale: 'ja' | 'en';
}

export default function ValidationPanel({ locale }: ValidationPanelProps) {
  const model = useModelStore((s) => s.model);

  const errors = useMemo(() => {
    const list: { type: 'error' | 'warning', message: string, target?: string }[] = [];

    // 1. Basic Events
    const beByEventId = new Map<string, typeof model.basicEvents[0]>();
    model.basicEvents.forEach(be => {
      if (be.eventId) {
        if (beByEventId.has(be.eventId)) {
          const firstBe = beByEventId.get(be.eventId)!;
          if (firstBe.probability !== be.probability || firstBe.name !== be.name) {
            list.push({
              type: 'warning',
              message: locale === 'ja'
                ? `基事象ID "${be.eventId}" を持つ基本事象の間で設定（機器名称や確率など）が一致していません。`
                : `Property mismatch among basic events sharing ID "${be.eventId}".`,
              target: be.id
            });
          }
        } else {
          beByEventId.set(be.eventId, be);
        }
      }

      // 基事象IDの英数字バリデーション
      if (be.eventId) {
        const isValidId = /^[a-zA-Z0-9\-_]+$/.test(be.eventId);
        if (!isValidId) {
          list.push({
            type: 'error',
            message: locale === 'ja'
              ? `基事象 "${be.name}" の基事象ID "${be.eventId}" に半角英数字以外の文字（全角や日本語など）が含まれています。`
              : `Basic event "${be.name}" has invalid custom ID "${be.eventId}". Only alphanumeric, hyphens, and underscores are allowed.`,
            target: be.id
          });
        }
      }

      const prob = be.probability ?? 0;
      if (prob === 0 && !be.parameterId && be.eventType !== 'transferGate') {
        list.push({ 
          type: 'warning', 
          message: locale === 'ja' ? `基事象 "${be.name}" の確率が0です。` : `Basic event "${be.name}" has probability 0.`,
          target: be.id 
        });
      }
    });

    // 2. Fault Trees
    model.faultTrees.forEach(ft => {
      ft.gates.forEach(gate => {
        if (!gate.children || gate.children.length === 0) {
          list.push({ 
            type: 'error', 
            message: locale === 'ja' ? `ゲート "${gate.name}" (FT: ${ft.name}) に子が設定されていません。` : `Gate "${gate.name}" (FT: ${ft.name}) has no children.`,
            target: gate.id 
          });
        }
      });
    });

    // 3. Event Trees
    model.eventTrees.forEach(et => {
      const ie = model.initiatingEvents.find(i => i.id === et.initiatingEventId);
      if (!ie || ie.frequency <= 0) {
        list.push({ 
          type: 'error', 
          message: locale === 'ja' ? `ET "${et.name}" の起因事象の頻度が設定されていません。` : `Initiating event frequency for ET "${et.name}" is not set.`,
          target: et.id 
        });
      }

      et.sequences.forEach(seq => {
        if (!seq.endStateId) {
          list.push({ 
            type: 'warning', 
            message: locale === 'ja' ? `ET "${et.name}" のシーケンス "${seq.name}" に終状態が割り当てられていません。` : `Sequence "${seq.name}" in ET "${et.name}" has no end state.`,
            target: seq.id 
          });
        }
      });

      et.functionalEvents.forEach(fe => {
        if (!fe.linkedFaultTreeId) {
          const branches = fe.branches || [];
          const hasManualProb = branches.some(b => (b.probability ?? 0) > 0);
          if (!hasManualProb) {
            list.push({ 
              type: 'warning', 
              message: locale === 'ja' ? `機能事象 "${fe.name}" にFTも手動確率も設定されていません。` : `Functional event "${fe.name}" has no linked FT or manual probabilities.`,
              target: fe.id 
            });
          }
        }
      });
    });

    return list;
  }, [model, locale]);

  if (errors.length === 0) {
    return (
      <div style={{ padding: '16px', color: 'var(--accent-green)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>✅</span> {locale === 'ja' ? 'モデルの整合性に問題はありません。' : 'No integrity issues found in the model.'}
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-color)' }}>
        {locale === 'ja' ? `整合性チェック (${errors.length})` : `Integrity Check (${errors.length})`}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto' }}>
        {errors.map((err, i) => (
          <div 
            key={i} 
            style={{ 
              padding: '8px 12px', 
              borderRadius: 'var(--radius-sm)',
              background: err.type === 'error' ? 'rgba(255, 71, 87, 0.1)' : 'rgba(255, 165, 2, 0.1)',
              borderLeft: `3px solid ${err.type === 'error' ? 'var(--accent-red)' : 'var(--accent-orange)'}`,
              fontSize: '12px',
              color: 'var(--text-primary)'
            }}
          >
            <span style={{ fontWeight: 700, marginRight: '8px', color: err.type === 'error' ? 'var(--accent-red)' : 'var(--accent-orange)' }}>
              {err.type === 'error' ? 'ERROR' : 'WARN'}
            </span>
            {err.message}
          </div>
        ))}
      </div>
    </div>
  );
}
