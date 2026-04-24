export const POS_COLORS = {
  C: '#8b5cf6', LW: '#8b5cf6', RW: '#8b5cf6', F: '#8b5cf6',
  D: '#3b82f6',
  G: '#f59e0b',
  UTIL: '#6366f1',
  BN: 'rgba(255,255,255,0.25)',
  IR: '#ef4444',
};

export const posColor = (pos) => POS_COLORS[pos] || 'rgba(255,255,255,0.3)';
