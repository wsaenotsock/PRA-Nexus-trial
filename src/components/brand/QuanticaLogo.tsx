import React from 'react';

interface QuanticaLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Quantica Risk ロゴマークコンポーネント (Concept B: Q-lens / magnifier)
 * 洞察・分析・精密さを表現する先進的なロゴマークです。
 */
export const QuanticaLogo: React.FC<QuanticaLogoProps> = ({ size = 24, className, style }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="290 50 110 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        overflow: 'visible',
        ...style
      }}
      role="img"
      aria-label="Quantica Risk Logo"
    >
      {/* 輝きやネオン感を高めるためのドロップシャドウフィルター (縮小時でもぼやけないよう加減) */}
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <g filter="url(#glow)">
        {/* Outer Q circle - メインの外枠 (小サイズでも際立つよう線幅と彩度を強化) */}
        <circle
          cx="340"
          cy="100"
          r="46"
          stroke="#00d2ff"
          strokeWidth="3.8"
          opacity="1.0"
        />
        
        {/* Inner data-rings */}
        <circle
          cx="340"
          cy="100"
          r="34"
          stroke="#00a8ff"
          strokeWidth="2.0"
          opacity="0.8"
        />
        <circle
          cx="340"
          cy="100"
          r="22"
          stroke="#85C1E9"
          strokeWidth="1.2"
          opacity="0.7"
        />

        {/* Q tail (magnifier handle) */}
        <line
          x1="372"
          y1="132"
          x2="394"
          y2="154"
          stroke="#00d2ff"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="1.0"
        />

        {/* Crosshair inside Q - 分析十字線 (太さを若干アップして視認性確保) */}
        <line
          x1="340"
          y1="68"
          x2="340"
          y2="132"
          stroke="#85C1E9"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
        <line
          x1="306"
          y1="100"
          x2="374"
          y2="100"
          stroke="#85C1E9"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Data scatter dots inside Q - 確率・散布データ点 */}
        <circle cx="328" cy="92" r="3" fill="#00d2ff" opacity="1.0" />
        <circle cx="348" cy="86" r="2.5" fill="#E0F7FA" opacity="0.95" />
        <circle cx="334" cy="112" r="2.5" fill="#00d2ff" opacity="0.95" />
        <circle cx="354" cy="106" r="3" fill="#81D4FA" opacity="1.0" />
        <circle cx="322" cy="106" r="2" fill="#B2EBF2" opacity="0.9" />
        <circle cx="352" cy="118" r="2.2" fill="#00d2ff" opacity="0.9" />
      </g>
    </svg>
  );
};
