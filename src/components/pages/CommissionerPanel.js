import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePwhlAuth } from '../../contexts/PwhlAuthContext';
import { pwhlFantasyAPI } from '../../services/pwhlAPI';
import PaymentPrompt from '../PaymentPrompt';

const CommissionerPanel = () => {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { isPwhlAuthenticated, pwhlUser } = usePwhlAuth();
  const [league, setLeague] = useState(null);
  const [scoring, setScoring] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [scoringEdits, setScoringEdits] = useState({});
  const [activeTab, setActiveTab] = useState('league');
  const [members, setMembers] = useState([]);
  const [paymentEdits, setPaymentEdits] = useState({
    entry_fee: '', payment_required: false,
    payment_venmo: '', payment_cashapp: '', payment_paypal: '',
    payment_other: '', payment_instructions: '',
  });

  useEffect(() => {
    if (!isPwhlAuthenticated) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [leagueRes, scoringRes, membersRes] = await Promise.all([
          pwhlFantasyAPI.getLeague(leagueId),
          pwhlFantasyAPI.getScoringSettings(leagueId).catch(() => ({ data: null })),
          pwhlFantasyAPI.getLeagueMembers(leagueId).catch(() => ({ data: [] })),
        ]);
        setLeague(leagueRes.data);
        setScoring(scoringRes.data);
        setMembers(membersRes.data || []);
        if (scoringRes.data) setScoringEdits(scoringRes.data);
        const l = leagueRes.data;
        if (l) setPaymentEdits({
          entry_fee: l.entry_fee || '',
          payment_required: l.payment_required || false,
          payment_venmo: l.payment_venmo || '',
          payment_cashapp: l.payment_cashapp || '',
          payment_paypal: l.payment_paypal || '',
          payment_other: l.payment_other || '',
          payment_instructions: l.payment_instructions || '',
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [leagueId, isPwhlAuthenticated]);

  const isCommissioner = league && pwhlUser && String(league.commissioner_id) === String(pwhlUser.id);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const startDraft = async () => {
    try {
      await pwhlFantasyAPI.startDraft(leagueId);
      showMsg('success', 'Draft started!');
      navigate(`/draft/${leagueId}`);
    } catch (err) {
      showMsg('error', err.response?.data?.detail || 'Failed to start draft');
    }
  };

  const generateSchedule = async () => {
    try {
      await pwhlFantasyAPI.generateSchedule(leagueId);
      showMsg('success', 'Schedule generated!');
    } catch (err) {
      showMsg('error', err.response?.data?.detail || 'Failed to generate schedule');
    }
  };

  const saveScoring = async () => {
    setSaving(true);
    try {
      await pwhlFantasyAPI.updateScoringSettings(leagueId, scoringEdits);
      showMsg('success', 'Scoring settings saved!');
    } catch (err) {
      showMsg('error', err.response?.data?.detail || 'Failed to save scoring');
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async (field, value) => {
    try {
      await pwhlFantasyAPI.updateLeagueSettings(leagueId, { [field]: value });
      setLeague(prev => ({ ...prev, [field]: value }));
      showMsg('success', 'Setting saved');
    } catch (err) {
      showMsg('error', 'Failed to save setting');
    }
  };

  const savePayment = async () => {
    setSaving(true);
    try {
      await pwhlFantasyAPI.updatePaymentSettings(leagueId, {
        ...paymentEdits,
        entry_fee: paymentEdits.entry_fee || null,
        payment_required: paymentEdits.payment_required,
      });
      showMsg('success', 'Payment settings saved!');
    } catch (err) {
      showMsg('error', err.response?.data?.detail || 'Failed to save');
    } finally { setSaving(false); }
  };

  const confirmedCount = members.filter(m => m.payment_confirmed).length;
  const paidCount = members.filter(m => m.payment_confirmed && m.role !== 'commissioner').length;

  if (!isPwhlAuthenticated) return <div style={styles.center}>Sign in to access commissioner tools.</div>;
  if (loading) return <div style={styles.center}>Loading...</div>;
  if (!isCommissioner) return <div style={styles.center}>Commissioner access required.</div>;

  const SCORING_FIELDS = [
    { key: 'goal_pts',          label: 'Goal',           category: 'Skater' },
    { key: 'assist_pts',        label: 'Assist',         category: 'Skater' },
    { key: 'shot_pts',          label: 'Shot on Goal',   category: 'Skater' },
    { key: 'plus_minus_pts',    label: '+/-',            category: 'Skater' },
    { key: 'pim_pts',           label: 'PIM',            category: 'Skater' },
    { key: 'hit_pts',           label: 'Hit',            category: 'Skater' },
    { key: 'block_pts',         label: 'Block',          category: 'Skater' },
    { key: 'goalie_win_pts',    label: 'Win',            category: 'Goalie' },
    { key: 'goalie_save_pts',   label: 'Save',           category: 'Goalie' },
    { key: 'goals_against_pts', label: 'Goals Against',  category: 'Goalie' },
    { key: 'shutout_pts',       label: 'Shutout',        category: 'Goalie' },
    { key: 'overtime_loss_pts', label: 'OT Loss',        category: 'Goalie' },
  ];

  const skaterFields = SCORING_FIELDS.filter(f => f.category === 'Skater');
  const goalieFields = SCORING_FIELDS.filter(f => f.category === 'Goalie');

  return (
    <div style={{ maxWidth: '700px' }}>
      <button style={styles.backBtn} onClick={() => navigate(`/leagues/${leagueId}`)}>
        <i className="fas fa-chevron-left" style={{ marginRight: '6px' }} />League
      </button>

      <div style={styles.titleRow}>
        <h2 style={styles.title}>
          <i className="fas fa-crown" style={{ marginRight: '10px', color: '#ffc107' }} />
          Commissioner Panel
        </h2>
        <span style={styles.leagueName}>{league?.name}</span>
      </div>

      {message && (
        <div style={{ ...styles.msg, background: message.type === 'success' ? 'rgba(0,200,83,0.12)' : 'rgba(255,82,82,0.12)', borderColor: message.type === 'success' ? 'rgba(0,200,83,0.3)' : 'rgba(255,82,82,0.3)', color: message.type === 'success' ? '#00c853' : '#ff5252' }}>
          {message.text}
        </div>
      )}

      <div style={styles.tabs}>
        {[['league', 'League'], ['scoring', 'Scoring'], ['payment', `💰 Entry Fee${league?.payment_required ? ' ✓' : ''}`], ['members', `Members (${members.length})`], ['actions', 'Actions']].map(([id, label]) => (
          <button
            key={id}
            style={{ ...styles.tab, ...(activeTab === id ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(id)}
          >{label}</button>
        ))}
      </div>

      {/* League settings */}
      {activeTab === 'league' && (
        <div style={styles.section}>
          <SettingRow label="Max Teams" value={league?.max_teams} type="number" min={2} max={20}
            onSave={v => saveSettings('max_teams', Number(v))} />
          <SettingRow label="Roster Size" value={league?.roster_size} type="number" min={10} max={30}
            onSave={v => saveSettings('roster_size', Number(v))} />
          <SettingRow label="Playoff Start Week" value={league?.playoff_start_week} type="number" min={10} max={22}
            onSave={v => saveSettings('playoff_start_week', Number(v))} />
          <SettingRow label="Playoff Teams" value={league?.playoff_teams} type="number" min={2} max={8}
            onSave={v => saveSettings('playoff_teams', Number(v))} />
          <SettingRow label="Trade Deadline" value={league?.trade_deadline ? league.trade_deadline.slice(0, 10) : ''} type="date"
            onSave={v => saveSettings('trade_deadline', v)} />
          <SettingRow label="Weekly Acquisition Limit" value={league?.weekly_acquisition_limit ?? 0} type="number" min={0} max={20}
            onSave={v => saveSettings('weekly_acquisition_limit', Number(v))} />
          <SettingRow label="FAAB Budget" value={league?.faab_budget ?? 100} type="number" min={0} max={1000}
            onSave={v => saveSettings('faab_budget', Number(v))} />
          <div style={styles.settingRow}>
            <span style={styles.settingLabel}>Public League</span>
            <button
              style={{ ...styles.toggleBtn, background: league?.is_public ? 'rgba(0,200,83,0.15)' : 'rgba(255,255,255,0.08)', color: league?.is_public ? '#00c853' : 'rgba(255,255,255,0.6)' }}
              onClick={() => saveSettings('is_public', !league?.is_public)}
            >
              {league?.is_public ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      )}

      {/* Scoring settings */}
      {activeTab === 'scoring' && scoring && (
        <div>
          <div style={styles.section}>
            <div style={styles.scoringCategory}>Skater</div>
            {skaterFields.map(f => (
              <div key={f.key} style={styles.settingRow}>
                <span style={styles.settingLabel}>{f.label}</span>
                <input
                  type="number"
                  step="0.1"
                  value={scoringEdits[f.key] ?? 0}
                  onChange={e => setScoringEdits(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                  style={styles.numInput}
                />
              </div>
            ))}
            <div style={styles.scoringCategory}>Goalie</div>
            {goalieFields.map(f => (
              <div key={f.key} style={styles.settingRow}>
                <span style={styles.settingLabel}>{f.label}</span>
                <input
                  type="number"
                  step="0.1"
                  value={scoringEdits[f.key] ?? 0}
                  onChange={e => setScoringEdits(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                  style={styles.numInput}
                />
              </div>
            ))}
          </div>
          <button
            style={{ ...styles.primaryBtn, opacity: saving ? 0.6 : 1 }}
            onClick={saveScoring}
            disabled={saving}
          >
            <i className="fas fa-save" style={{ marginRight: '8px' }} />{saving ? 'Saving...' : 'Save Scoring Settings'}
          </button>
        </div>
      )}

      {/* Payment / Entry Fee */}
      {activeTab === 'payment' && (
        <div>
          <div style={styles.section}>
            {/* Enable/disable toggle */}
            <div style={styles.settingRow}>
              <div>
                <span style={styles.settingLabel}>Require Entry Fee</span>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                  Members must confirm payment before the draft
                </div>
              </div>
              <button
                style={{ ...styles.toggleBtn, background: paymentEdits.payment_required ? 'rgba(0,200,83,0.15)' : 'rgba(255,255,255,0.08)', color: paymentEdits.payment_required ? '#00c853' : 'rgba(255,255,255,0.6)' }}
                onClick={() => setPaymentEdits(p => ({ ...p, payment_required: !p.payment_required }))}
              >
                {paymentEdits.payment_required ? 'On' : 'Off'}
              </button>
            </div>

            {paymentEdits.payment_required && (<>
              {/* Entry fee amount */}
              <div style={styles.settingRow}>
                <span style={styles.settingLabel}>Entry Fee ($)</span>
                <input type="number" min="0" step="1" value={paymentEdits.entry_fee}
                  onChange={e => setPaymentEdits(p => ({ ...p, entry_fee: e.target.value }))}
                  style={{ ...styles.numInput, width: '90px' }} placeholder="20" />
              </div>

              {/* Payment handles */}
              {[
                { field: 'payment_venmo',   label: 'Venmo',   placeholder: '@YourHandle' },
                { field: 'payment_cashapp', label: 'Cash App', placeholder: '$YourHandle' },
                { field: 'payment_paypal',  label: 'PayPal',  placeholder: 'paypal.me/you or email' },
                { field: 'payment_other',   label: 'Other',   placeholder: 'Zelle phone, Apple Pay, etc.' },
              ].map(({ field, label, placeholder }) => (
                <div key={field} style={styles.settingRow}>
                  <span style={styles.settingLabel}>{label}</span>
                  <input type="text" value={paymentEdits[field]}
                    onChange={e => setPaymentEdits(p => ({ ...p, [field]: e.target.value }))}
                    style={{ ...styles.numInput, width: '200px' }} placeholder={placeholder} />
                </div>
              ))}

              {/* Instructions */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ ...styles.settingLabel, marginBottom: '6px' }}>Instructions for players</div>
                <textarea
                  value={paymentEdits.payment_instructions}
                  onChange={e => setPaymentEdits(p => ({ ...p, payment_instructions: e.target.value }))}
                  rows={3}
                  placeholder="e.g. Send $20 with note 'Fantasy League - [Your Name]' before the draft starts."
                  style={{ ...styles.numInput, width: '100%', resize: 'vertical', fontFamily: 'Manrope, sans-serif', fontSize: '0.875rem', lineHeight: '1.5' }}
                />
              </div>
            </>)}
          </div>

          <button style={{ ...styles.primaryBtn, opacity: saving ? 0.6 : 1 }} onClick={savePayment} disabled={saving}>
            <i className="fas fa-save" style={{ marginRight: '8px' }} />{saving ? 'Saving...' : 'Save Payment Settings'}
          </button>

          {/* Preview */}
          {paymentEdits.payment_required && (paymentEdits.payment_venmo || paymentEdits.payment_cashapp || paymentEdits.payment_paypal || paymentEdits.payment_other) && (
            <div style={{ marginTop: '1.5rem', background: 'rgba(255,193,7,0.06)', border: '1px solid rgba(255,193,7,0.2)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', color: '#ffc107', marginBottom: '10px', letterSpacing: '0.06em' }}>
                Preview — what members see when joining
              </div>
              <PaymentPrompt league={{ ...league, ...paymentEdits }} preview />
            </div>
          )}
        </div>
      )}

      {/* Members + payment status */}
      {activeTab === 'members' && (
        <div>
          {league?.payment_required && (
            <div style={{ background: 'rgba(0,200,83,0.08)', border: '1px solid rgba(0,200,83,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '1rem', fontSize: '0.875rem', color: '#00c853' }}>
              <i className="fas fa-money-bill-wave" style={{ marginRight: '8px' }} />
              {paidCount} of {members.filter(m => m.role !== 'commissioner').length} members have confirmed payment
            </div>
          )}
          <div style={styles.section}>
            {members.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No members yet</div>
            ) : (
              members.map((m, i) => (
                <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--pink), var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                      {(m.username || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: '500', fontSize: '0.875rem' }}>{m.username}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{m.role}</div>
                    </div>
                  </div>
                  {league?.payment_required && m.role !== 'commissioner' && (
                    <span style={{ fontSize: '0.78rem', fontWeight: '600', color: m.payment_confirmed ? '#00c853' : '#ffc107' }}>
                      {m.payment_confirmed
                        ? <><i className="fas fa-check-circle" style={{ marginRight: '4px' }} />Paid</>
                        : <><i className="fas fa-clock" style={{ marginRight: '4px' }} />Pending</>}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {activeTab === 'actions' && (
        <div style={styles.section}>
          <ActionCard
            icon="fas fa-random"
            title="Start Draft"
            desc={league?.draft_status === 'pending' ? 'Begin the snake draft for your league.' : `Draft is ${league?.draft_status}.`}
            btnLabel="Start Draft"
            btnDisabled={league?.draft_status !== 'pending'}
            onClick={startDraft}
          />
          <ActionCard
            icon="fas fa-calendar-alt"
            title="Generate Schedule"
            desc="Regenerate the weekly matchup schedule. Use after adding teams or changing playoff settings."
            btnLabel="Generate Schedule"
            onClick={generateSchedule}
          />
          <ActionCard
            icon="fas fa-link"
            title="Invite Code"
            desc={`Share this code with others to join: ${league?.invite_code || '—'}`}
            btnLabel="Copy Code"
            onClick={() => { navigator.clipboard.writeText(league?.invite_code || ''); showMsg('success', 'Invite code copied!'); }}
          />
        </div>
      )}
    </div>
  );
};

const SettingRow = ({ label, value, type, min, max, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  return (
    <div style={styles.settingRow}>
      <span style={styles.settingLabel}>{label}</span>
      {editing ? (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            type={type || 'text'}
            value={val}
            min={min} max={max}
            onChange={e => setVal(e.target.value)}
            style={styles.numInput}
            autoFocus
          />
          <button style={styles.saveBtn} onClick={() => { onSave(val); setEditing(false); }}>Save</button>
          <button style={styles.cancelBtn} onClick={() => { setVal(value); setEditing(false); }}>✕</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ color: '#fff', fontSize: '0.9rem' }}>{val || '—'}</span>
          <button style={styles.editBtn} onClick={() => setEditing(true)}>Edit</button>
        </div>
      )}
    </div>
  );
};

const ActionCard = ({ icon, title, desc, btnLabel, btnDisabled, onClick }) => (
  <div style={styles.actionCard}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
      <div style={styles.actionIcon}><i className={icon} style={{ color: 'var(--pink)' }} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', color: '#fff', marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>{desc}</div>
        <button
          style={{ ...styles.primaryBtn, opacity: btnDisabled ? 0.4 : 1 }}
          disabled={btnDisabled}
          onClick={onClick}
        >
          {btnLabel}
        </button>
      </div>
    </div>
  </div>
);

const styles = {
  center: { textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' },
  backBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.875rem', padding: '0 0 0.75rem', display: 'flex', alignItems: 'center' },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' },
  title: { fontSize: '1.4rem', fontWeight: '700', color: '#fff', margin: 0, display: 'flex', alignItems: 'center' },
  leagueName: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' },
  msg: { padding: '10px 14px', borderRadius: '8px', border: '1px solid', marginBottom: '12px', fontSize: '0.875rem' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '1.5rem' },
  tab: { padding: '8px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' },
  tabActive: { background: 'rgba(255,124,222,0.15)', borderColor: 'rgba(255,124,222,0.4)', color: 'var(--pink)' },
  section: { background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: '1rem' },
  settingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  settingLabel: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' },
  numInput: { width: '80px', padding: '6px 10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '0.875rem', textAlign: 'center', outline: 'none' },
  saveBtn: { background: 'rgba(0,200,83,0.15)', border: '1px solid rgba(0,200,83,0.3)', color: '#00c853', padding: '5px 10px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' },
  cancelBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.9rem' },
  editBtn: { background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.6)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' },
  toggleBtn: { padding: '6px 14px', border: 'none', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' },
  scoringCategory: { padding: '8px 16px', background: 'rgba(255,255,255,0.03)', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  actionCard: { padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  actionIcon: { width: '36px', height: '36px', background: 'rgba(255,124,222,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  primaryBtn: { background: 'linear-gradient(135deg, var(--pink), var(--violet))', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' },
};

export default CommissionerPanel;
