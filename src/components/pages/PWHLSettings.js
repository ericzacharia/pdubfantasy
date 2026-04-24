import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePwhlAuth } from '../../contexts/PwhlAuthContext';
import { pwhlAuthAPI } from '../../services/pwhlAPI';

const SCORING_RULES = [
  { category: 'Skater', rules: [
    { stat: 'Goal',         pts: '+2.0',  icon: 'fas fa-hockey-puck' },
    { stat: 'Assist',       pts: '+1.5',  icon: 'fas fa-hands-helping' },
    { stat: 'Shot on Goal', pts: '+0.1',  icon: 'fas fa-bullseye' },
    { stat: '+/-',          pts: '+0.5',  icon: 'fas fa-plus-minus' },
    { stat: 'Block',        pts: '+0.1',  icon: 'fas fa-shield-alt' },
    { stat: 'PIM',          pts: '−0.1',  icon: 'fas fa-gavel' },
  ]},
  { category: 'Goalie', rules: [
    { stat: 'Win',           pts: '+4.0', icon: 'fas fa-trophy' },
    { stat: 'Save',          pts: '+0.2', icon: 'fas fa-hand-paper' },
    { stat: 'Goals Against', pts: '−2.0', icon: 'fas fa-times-circle' },
    { stat: 'Shutout',       pts: '+3.0', icon: 'fas fa-shield-alt' },
    { stat: 'OT Loss',       pts: '+1.0', icon: 'fas fa-clock' },
  ]},
];

const PWHLSettings = () => {
  const { isPwhlAuthenticated, pwhlUser, logout } = usePwhlAuth();
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setSavingPw(true);
    setPwError('');
    try {
      await pwhlAuthAPI.changePassword(currentPw, newPw);
      setPwSuccess(true);
      setCurrentPw(''); setNewPw('');
      setShowChangePassword(false);
    } catch (err) {
      setPwError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Profile */}
      {isPwhlAuthenticated && pwhlUser ? (
        <Section title="Profile" icon="fas fa-user">
          <div style={styles.profileRow}>
            <div style={styles.avatar}>
              {(pwhlUser.username || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={styles.username}>{pwhlUser.username}</div>
              <div style={styles.email}>{pwhlUser.email}</div>
            </div>
          </div>

          {pwSuccess && (
            <div style={styles.successMsg}><i className="fas fa-check" style={{ marginRight: '6px' }} />Password changed successfully</div>
          )}

          <button style={styles.outlineBtn} onClick={() => setShowChangePassword(!showChangePassword)}>
            <i className="fas fa-lock" style={{ marginRight: '7px' }} />Change Password
          </button>

          {showChangePassword && (
            <form onSubmit={handleChangePassword} style={styles.pwForm}>
              {pwError && <div style={styles.errorMsg}>{pwError}</div>}
              <div style={styles.field}>
                <label style={styles.label}>Current Password</label>
                <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} style={styles.input} required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>New Password</label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} style={styles.input} placeholder="Min 8 characters" required />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" style={{ ...styles.primaryBtn, opacity: savingPw ? 0.6 : 1 }} disabled={savingPw}>
                  {savingPw ? 'Saving...' : 'Update Password'}
                </button>
                <button type="button" style={styles.cancelBtn} onClick={() => { setShowChangePassword(false); setPwError(''); }}>Cancel</button>
              </div>
            </form>
          )}

          <button style={styles.logoutBtn} onClick={handleLogout}>
            <i className="fas fa-sign-out-alt" style={{ marginRight: '7px' }} />Sign Out
          </button>
        </Section>
      ) : (
        <Section title="Account" icon="fas fa-user">
          <p style={{ color: 'rgba(255,255,255,0.80)', marginBottom: '16px' }}>Sign in to manage your PWHL Fantasy account.</p>
          <button style={styles.primaryBtn} onClick={() => navigate('/login')}>Sign In</button>
        </Section>
      )}

      {/* Scoring Rules */}
      <Section title="Scoring System" icon="fas fa-calculator">
        {SCORING_RULES.map(group => (
          <div key={group.category} style={styles.scoringGroup}>
            <div style={styles.scoringCategory}>{group.category}</div>
            {group.rules.map(rule => (
              <div key={rule.stat} style={styles.scoringRow}>
                <div style={styles.scoringStat}>
                  <i className={rule.icon} style={{ marginRight: '8px', color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', width: '16px' }} />
                  {rule.stat}
                </div>
                <div style={{ ...styles.scoringPts, color: rule.pts.startsWith('-') ? '#ff5252' : '#00c853' }}>
                  {rule.pts} pts
                </div>
              </div>
            ))}
          </div>
        ))}
      </Section>

      {/* About */}
      <Section title="About" icon="fas fa-info-circle">
        <div style={styles.aboutRow}>
          <i className="fas fa-hockey-puck" style={{ fontSize: '2rem', color: 'var(--pink)' }} />
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: '600', color: '#fff' }}>PWHL Fantasy Hockey</div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', marginTop: '4px' }}>
              Built on UnsupervisedBias.com
            </div>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.80)', fontSize: '0.875rem', lineHeight: '1.6', marginTop: '12px' }}>
          This is an unofficial fantasy hockey platform for the Professional Women's Hockey League.
          Stats and data are sourced from the PWHL. This app is not affiliated with or endorsed by the PWHL.
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <a href="mailto:eric@unsupervisedbias.com" style={styles.linkBtn}>
            <i className="fas fa-envelope" style={{ marginRight: '6px' }} />Contact
          </a>
          <a href="/privacy-policy" style={styles.linkBtn}>Privacy Policy</a>
        </div>
      </Section>
    </div>
  );
};

const Section = ({ title, icon, children }) => (
  <div style={styles.section}>
    <div style={styles.sectionHeader}>
      <i className={icon} style={{ color: 'var(--pink)', marginRight: '8px' }} />
      <h3 style={styles.sectionTitle}>{title}</h3>
    </div>
    <div style={styles.sectionBody}>{children}</div>
  </div>
);

const styles = {
  container: { maxWidth: '640px' },
  section: { marginBottom: '1.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' },
  sectionHeader: { display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  sectionTitle: { margin: 0, fontSize: '1rem', fontWeight: '600', color: '#fff' },
  sectionBody: { padding: '20px' },
  profileRow: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' },
  avatar: { width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--pink), var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: '700', color: '#fff', flexShrink: 0 },
  username: { fontSize: '1.05rem', fontWeight: '600', color: '#fff' },
  email: { fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', marginTop: '2px' },
  successMsg: { background: 'rgba(0,200,83,0.12)', border: '1px solid rgba(0,200,83,0.3)', color: '#00c853', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.875rem' },
  outlineBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.88)', padding: '9px 18px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', marginBottom: '12px' },
  pwForm: { background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '16px', marginBottom: '14px' },
  field: { marginBottom: '12px' },
  label: { display: 'block', color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem', fontWeight: '600', marginBottom: '5px' },
  input: { width: '100%', padding: '9px 13px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' },
  errorMsg: { background: 'rgba(255,82,82,0.12)', border: '1px solid rgba(255,82,82,0.3)', color: '#ff5252', padding: '9px 13px', borderRadius: '7px', marginBottom: '12px', fontSize: '0.875rem' },
  primaryBtn: { background: 'linear-gradient(135deg, var(--pink), var(--violet))', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  cancelBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontSize: '0.875rem' },
  logoutBtn: { background: 'rgba(255,82,82,0.12)', border: '1px solid rgba(255,82,82,0.25)', color: '#ff5252', padding: '9px 18px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', marginTop: '8px' },
  scoringGroup: { marginBottom: '16px' },
  scoringCategory: { fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.55)', marginBottom: '8px' },
  scoringRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  scoringStat: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center' },
  scoringPts: { fontSize: '0.875rem', fontWeight: '700' },
  aboutRow: { display: 'flex', alignItems: 'center', gap: '14px' },
  linkBtn: { color: 'var(--pink)', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center' },
};

export default PWHLSettings;
