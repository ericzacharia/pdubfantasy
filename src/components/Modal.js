import React, { useEffect } from 'react';

const Modal = ({ title, onClose, children, maxWidth = '480px', noPadding = false }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      style={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div style={{ ...styles.card, maxWidth, padding: noPadding ? 0 : '1.5rem' }}>
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close dialog">
            <i className="fas fa-times" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const MessageBanner = ({ message }) => {
  if (!message) return null;
  const colors = {
    success: { bg: 'rgba(0,200,83,0.12)', border: 'rgba(0,200,83,0.3)', text: '#00c853' },
    error:   { bg: 'rgba(255,82,82,0.12)',  border: 'rgba(255,82,82,0.3)',  text: '#ff5252' },
    info:    { bg: 'rgba(255,193,7,0.12)',  border: 'rgba(255,193,7,0.3)',  text: '#ffc107' },
    warn:    { bg: 'rgba(255,193,7,0.12)',  border: 'rgba(255,193,7,0.3)',  text: '#ffc107' },
  };
  const c = colors[message.type] || colors.info;
  return (
    <div role="alert" aria-live="polite" style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontSize: '0.875rem', marginBottom: '12px' }}>
      {message.text}
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  card:    { background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxHeight: '90vh', overflowY: 'auto' },
  header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  title:   { margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: '700' },
  closeBtn:{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1rem', padding: '4px' },
};

export default Modal;
