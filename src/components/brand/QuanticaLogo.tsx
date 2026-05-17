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
  const logoSrc = theme === 'light' ? '/logo-light.png' : '/logo-dark.png';

  return (
    <div 
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'auto',
        height: 'auto',
        ...style
      }}
    >
      <img 
        src={logoSrc} 
        alt="Quantica Risk Logo" 
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};
