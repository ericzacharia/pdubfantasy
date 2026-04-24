import React from 'react';
import { posColor } from '../utils/positionColors';

const PosBadge = ({ pos, size = 'sm' }) => {
  const color = posColor(pos);
  const pad = size === 'lg' ? '3px 9px' : '1px 5px';
  const fs  = size === 'lg' ? '0.78rem' : '0.65rem';
  return (
    <span
      aria-label={`Position: ${pos}`}
      style={{ background: color + '22', color, border: `1px solid ${color}55`, borderRadius: '4px', padding: pad, fontSize: fs, fontWeight: '700', flexShrink: 0, whiteSpace: 'nowrap' }}
    >
      {pos}
    </span>
  );
};

export default PosBadge;
