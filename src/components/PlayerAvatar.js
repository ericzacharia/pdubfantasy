import React, { useState } from 'react';
import { posColor } from '../utils/positionColors';

const PlayerAvatar = ({ src, name, position, size = 36, style = {} }) => {
  const [failed, setFailed] = useState(false);

  const initials = name
    ? name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : '?';

  const color = posColor(position);

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
        alt={name || 'Player'}
        role="img"
        style={baseStyle}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={name || 'Player avatar'}
      style={{
        ...baseStyle,
        background: color + '33',
        border: `1px solid ${color}66`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.35,
        fontWeight: '700',
        color,
        userSelect: 'none',
      }}
    >
      {initials}
    </div>
  );
};

export default PlayerAvatar;
