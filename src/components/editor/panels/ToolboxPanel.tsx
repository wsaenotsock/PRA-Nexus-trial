'use client';

import React from 'react';
import type { FTNodeType } from '@/lib/types';

interface ToolboxItem {
  type: FTNodeType;
  label: string;
  labelEn: string;
  iconClass: string;
  iconText: string;
}

const toolboxItems: ToolboxItem[] = [
  { type: 'orGate', label: 'ORゲート', labelEn: 'OR Gate', iconClass: 'toolbox__item-icon--or', iconText: '∨' },
  { type: 'andGate', label: 'ANDゲート', labelEn: 'AND Gate', iconClass: 'toolbox__item-icon--and', iconText: '∧' },
  { type: 'atleastGate', label: 'K/Nゲート', labelEn: 'K/N Gate', iconClass: 'toolbox__item-icon--and', iconText: 'K' },
  { type: 'basicEvent', label: '基事象', labelEn: 'Basic Event', iconClass: 'toolbox__item-icon--basic', iconText: '○' },
  { type: 'houseEvent', label: 'ハウス事象', labelEn: 'House Event', iconClass: 'toolbox__item-icon--house', iconText: '⌂' },
  { type: 'transferGate', label: 'トランスファ', labelEn: 'Transfer', iconClass: 'toolbox__item-icon--transfer', iconText: '△' },
  { type: 'undeveloped', label: '未展開事象', labelEn: 'Undeveloped', iconClass: 'toolbox__item-icon--undeveloped', iconText: '◇' },
];

interface ToolboxPanelProps {
  locale?: 'ja' | 'en';
}

export default function ToolboxPanel({ locale = 'ja' }: ToolboxPanelProps) {
  const onDragStart = (event: React.DragEvent, nodeType: FTNodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="toolbox">
      <div className="toolbox__section">
        <div className="toolbox__section-title">
          {locale === 'ja' ? 'ゲート' : 'Gates'}
        </div>
        {toolboxItems.filter(i => i.type.includes('Gate') || i.type.includes('gate')).map((item) => (
          <div
            key={item.type}
            className="toolbox__item"
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
          >
            <div className={`toolbox__item-icon ${item.iconClass}`}>
              {item.iconText}
            </div>
            <span>{locale === 'ja' ? item.label : item.labelEn}</span>
          </div>
        ))}
      </div>

      <div className="toolbox__section">
        <div className="toolbox__section-title">
          {locale === 'ja' ? '事象' : 'Events'}
        </div>
        {toolboxItems.filter(i => !i.type.includes('Gate') && !i.type.includes('gate')).map((item) => (
          <div
            key={item.type}
            className="toolbox__item"
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
          >
            <div className={`toolbox__item-icon ${item.iconClass}`}>
              {item.iconText}
            </div>
            <span>{locale === 'ja' ? item.label : item.labelEn}</span>
          </div>
        ))}
      </div>

      <div className="toolbox__section">
        <div className="toolbox__section-title">
          {locale === 'ja' ? '操作ヒント' : 'Tips'}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.8 }}>
          <div>📌 {locale === 'ja' ? 'ドラッグ&ドロップで配置' : 'Drag & Drop to place'}</div>
          <div>🔗 {locale === 'ja' ? '既存ゲート上へのドロップで接続' : 'Drop onto gates to connect'}</div>
          <div>🖱️ {locale === 'ja' ? 'ダブルクリックでゲートの開閉' : 'Double-click to expand/collapse'}</div>
          <div>⌨️ {locale === 'ja' ? 'Deleteキーで要素や接続線を削除' : 'Delete key to remove items/edges'}</div>
          <div>⌨️ {locale === 'ja' ? 'Ctrl+S:保存 / Ctrl+Z:元に戻す / Ctrl+Y:やり直し' : 'Ctrl+S:Save / Ctrl+Z:Undo / Ctrl+Y:Redo'}</div>
          <div>🔍 {locale === 'ja' ? 'ホイールでズーム / 右クリックでメニュー' : 'Scroll to zoom / Right-click for menu'}</div>
        </div>
      </div>
    </div>
  );
}
