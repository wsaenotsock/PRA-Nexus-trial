import React from 'react';

interface QuanticaLogoProps {
  size?: number; // Base size (width)
  className?: string;
  style?: React.CSSProperties;
  theme?: 'light' | 'dark';
}

/**
 * Quantica Risk 新ロゴコンポーネント
 * ユーザー提供のロゴ画像（ライト/ダーク）を表示します。
 */
export const QuanticaLogo: React.FC<QuanticaLogoProps> = ({ 
  size = 160, 
  className, 
  style,
  theme = 'dark'
}) => {
  const logoSrc = theme === 'light' 
    ? '/quantica_risk_logo_light_v2_quantica_center.svg' 
    : '/quantica_risk_logo_dark_v2_quantica_center.svg';

  return (
    <div 
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
    >
      <img 
        src={logoSrc} 
        alt="Quantica Risk Logo" 
        style={{
          height: '100%',
          width: '100%',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};
