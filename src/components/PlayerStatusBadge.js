import React from 'react';

const STATUS_CONFIG = {
  healthy:   { label: null, color: null },  // don't show badge for healthy
  'day-to-day': { label: 'DTD', color: '#ffc107', bg: 'rgba(255,193,7,0.15)' },
  ir:        { label: 'IR',  color: '#ff5252', bg: 'rgba(255,82,82,0.15)' },
  ltir:      { label: 'LTIR', color: '#ff5252', bg: 'rgba(255,82,82,0.15)' },
  suspended: { label: 'SUSP', color: '#ff9800', bg: 'rgba(255,152,0,0.15)' },
};

const PlayerStatusBadge = ({ status, note, size = 'sm' }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.healthy;
  if (!config.label) return null;

  return (
    <span
      title={note || status}
      style={{
        display: 'inline-block',
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.color}44`,
        borderRadius: '4px',
        padding: size === 'sm' ? '1px 5px' : '3px 8px',
        fontSize: size === 'sm' ? '0.65rem' : '0.78rem',
        fontWeight: '700',
        letterSpacing: '0.04em',
        verticalAlign: 'middle',
        marginLeft: '5px',
        cursor: note ? 'help' : 'default',
      }}
    >
      {config.label}
    </span>
  );
};

export default PlayerStatusBadge;
