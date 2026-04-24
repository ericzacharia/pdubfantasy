import React, { useState } from 'react';
import { pwhlFantasyAPI } from '../services/pwhlAPI';

const METHOD_ICONS = {
  venmo:   { icon: 'fas fa-v', label: 'Venmo',    color: '#3D95CE' },
  cashapp: { icon: 'fas fa-dollar-sign', label: 'Cash App', color: '#00D632' },
  paypal:  { icon: 'fab fa-paypal', label: 'PayPal',   color: '#003087' },
  other:   { icon: 'fas fa-money-bill-wave', label: 'Other', color: '#ffc107' },
};

const PaymentPrompt = ({ league, leagueId, onConfirmed, preview = false }) => {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const methods = [
    league.payment_venmo   && { type: 'venmo',   handle: league.payment_venmo },
    league.payment_cashapp && { type: 'cashapp', handle: league.payment_cashapp },
    league.payment_paypal  && { type: 'paypal',  handle: league.payment_paypal },
    league.payment_other   && { type: 'other',   handle: league.payment_other },
  ].filter(Boolean);

  const handleConfirm = async () => {
    if (preview) return;
    setSubmitting(true);
    try {
      await pwhlFantasyAPI.confirmPayment(leagueId);
      setDone(true);
      if (onConfirmed) onConfirmed();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to confirm');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div style={styles.success}>
        <i className="fas fa-check-circle" style={{ color: '#00c853', fontSize: '1.5rem', marginBottom: '8px' }} />
        <div style={{ color: '#00c853', fontWeight: '600' }}>Payment confirmed!</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', marginTop: '4px' }}>
          The commissioner will verify and approve you.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.box}>
      <div style={styles.header}>
        <i className="fas fa-lock" style={{ color: '#ffc107', marginRight: '8px' }} />
        <span style={{ fontWeight: '700', color: '#fff' }}>Entry Fee Required</span>
        {league.entry_fee && (
          <span style={styles.feeBadge}>${Number(league.entry_fee).toFixed(0)}</span>
        )}
      </div>

      <p style={styles.desc}>
        This league requires an entry fee. Send payment to the commissioner using one of the methods below, then confirm below.
      </p>

      {/* Payment methods */}
      <div style={styles.methods}>
        {methods.map(({ type, handle }) => {
          const m = METHOD_ICONS[type];
          return (
            <div key={type} style={styles.methodRow}>
              <div style={{ ...styles.methodIcon, background: m.color + '22', color: m.color }}>
                <i className={m.icon} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
                <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.95rem' }}>{handle}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      {league.payment_instructions && (
        <div style={styles.instructions}>
          <i className="fas fa-info-circle" style={{ marginRight: '6px', color: 'rgba(255,255,255,0.4)' }} />
          {league.payment_instructions}
        </div>
      )}

      {/* Confirmation checkbox */}
      {!preview && (
        <label style={styles.checkLabel}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            style={{ accentColor: '#00c853', width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span>I confirm I have sent the entry fee to the commissioner</span>
        </label>
      )}

      {!preview && (
        <button
          style={{ ...styles.confirmBtn, opacity: (!confirmed || submitting) ? 0.4 : 1 }}
          disabled={!confirmed || submitting}
          onClick={handleConfirm}
        >
          {submitting ? 'Confirming...' : 'Confirm Payment Sent'}
        </button>
      )}
    </div>
  );
};

const styles = {
  box: { background: 'rgba(255,193,7,0.06)', border: '1px solid rgba(255,193,7,0.25)', borderRadius: '12px', padding: '20px' },
  header: { display: 'flex', alignItems: 'center', marginBottom: '10px' },
  feeBadge: { marginLeft: 'auto', background: 'rgba(255,193,7,0.2)', color: '#ffc107', padding: '3px 12px', borderRadius: '12px', fontWeight: '800', fontSize: '1rem' },
  desc: { color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem', margin: '0 0 16px', lineHeight: '1.5' },
  methods: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' },
  methodRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' },
  methodIcon: { width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 },
  instructions: { background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginBottom: '14px', lineHeight: '1.5' },
  checkLabel: { display: 'flex', alignItems: 'flex-start', gap: '10px', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '14px', lineHeight: '1.4' },
  confirmBtn: { width: '100%', padding: '12px', background: 'linear-gradient(135deg, #00c853, #00960f)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' },
  success: { textAlign: 'center', padding: '24px', background: 'rgba(0,200,83,0.06)', border: '1px solid rgba(0,200,83,0.2)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
};

export default PaymentPrompt;
