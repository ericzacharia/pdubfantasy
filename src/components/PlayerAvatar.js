import React, { useState } from 'react';

const POS_COLORS = {
  C: '#8b5cf6', LW: '#8b5cf6', RW: '#8b5cf6', F: '#8b5cf6',
  D: '#3b82f6',
  G: '#f59e0b',
};

const PlayerAvatar = ({ src, name, position, size = 36, style = {} }) => {
  const [failed, setFailed] = useState(false);

  const initials = name
    ? name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : '?';

  const bgColor = POS_COLORS[position] || 'rgba(255,255,255,0.15)';

  const baseStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
    ...style,
  };

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name || ''}
        style={baseStyle}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div style={{
      ...baseStyle,
      background: bgColor + '33',
      border: `1px solid ${bgColor}66`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.35,
      fontWeight: '700',
      color: bgColor,
    }}>
      {initials}
    </div>
  );
};

export default PlayerAvatar;
