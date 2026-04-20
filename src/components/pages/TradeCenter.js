import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePwhlAuth } from '../../contexts/PwhlAuthContext';
import { pwhlFantasyAPI } from '../../services/pwhlAPI';

const STATUS_COLORS = {
  pending:  { bg: 'rgba(255,193,7,0.15)',  text: '#ffc107' },
  accepted: { bg: 'rgba(0,200,83,0.15)',   text: '#00c853' },
  rejected: { bg: 'rgba(255,82,82,0.15)',  text: '#ff5252' },
  vetoed:   { bg: 'rgba(255,82,82,0.15)',  text: '#ff5252' },
  cancelled:{ bg: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.4)' },
};

const TradeCenter = () => {
  const { leagueId, teamId } = useParams();
  const navigate = useNavigate();
  const { isPwhlAuthenticated, pwhlUser } = usePwhlAuth();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('incoming');
  const [showPropose, setShowPropose] = useState(false);
  const [message, setMessage] = useState(null);
  const [leagueTeams, setLeagueTeams] = useState([]);
  const [myTeam, setMyTeam] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tradesRes, teamsRes] = await Promise.all([
        pwhlFantasyAPI.getMyTrades().catch(() => ({ data: [] })),
        pwhlFantasyAPI.getLeagueTeams(leagueId).catch(() => ({ data: [] })),
      ]);
      setTrades(tradesRes.data || []);
      const teams = teamsRes.data || [];
      setLeagueTeams(teams);
      const mine = teams.find(t => String(t.id) === String(teamId));
      setMyTeam(mine || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [leagueId, teamId]);

  useEffect(() => {
    if (isPwhlAuthenticated) fetchData();
  }, [isPwhlAuthenticated, fetchData]);

  const respondToTrade = async (tradeId, accept) => {
    try {
      await pwhlFantasyAPI.respondToTrade(tradeId, accept);
      showMsg('success', accept ? 'Trade accepted!' : 'Trade declined');
      fetchData();
    } catch (err) {
      showMsg('error', err.response?.data?.detail || 'Failed to respond to trade');
    }
  };

  const vetoTrade = async (tradeId) => {
    try {
      await pwhlFantasyAPI.vetoTrade(tradeId);
      showMsg('success', 'Veto vote cast');
      fetchData();
    } catch (err) {
      showMsg('error', 'Failed to veto');
    }
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  // Filter trades by tab
  const leagueTradeIds = new Set([...leagueTeams.map(t => t.id)]);
  const leagueTrades = trades.filter(t => leagueTradeIds.has(t.proposing_team_id) || leagueTradeIds.has(t.receiving_team_id));
  const incoming = leagueTrades.filter(t => String(t.receiving_team_id) === String(teamId) && t.status === 'pending');
  const outgoing = leagueTrades.filter(t => String(t.proposing_team_id) === String(teamId) && t.status === 'pending');
  const history = leagueTrades.filter(t => t.status !== 'pending');

  const tabCounts = { incoming: incoming.length, outgoing: outgoing.length, history: history.length };
  const displayTrades = { incoming, outgoing, history }[activeTab] || [];

  if (!isPwhlAuthenticated) return <div style={styles.center}>Sign in to access trades.</div>;
  if (loading) return <div style={styles.center}>Loading trades...</div>;

  return (
    <div>
      <button style={styles.backBtn} onClick={() => navigate(-1)}>
        <i className="fas fa-chevron-left" style={{ marginRight: '6px' }} />Back
      </button>

      <div style={styles.titleRow}>
        <h2 style={styles.title}>Trade Center</h2>
        <button style={styles.primaryBtn} onClick={() => setShowPropose(true)}>
          <i className="fas fa-handshake" style={{ marginRight: '7px' }} />Propose Trade
        </button>
      </div>

      {message && (
        <div style={{ ...styles.msgBanner, background: message.type === 'success' ? 'rgba(0,200,83,0.12)' : 'rgba(255,82,82,0.12)', borderColor: message.type === 'success' ? 'rgba(0,200,83,0.3)' : 'rgba(255,82,82,0.3)', color: message.type === 'success' ? '#00c853' : '#ff5252' }}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabBar}>
        {[['incoming','Incoming'],['outgoing','Outgoing'],['history','History']].map(([id, label]) => (
          <button
            key={id}
            style={{ ...styles.tab, ...(activeTab === id ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(id)}
          >
            {label}
            {tabCounts[id] > 0 && <span style={styles.badge}>{tabCounts[id]}</span>}
          </button>
        ))}
      </div>

      {displayTrades.length === 0 ? (
        <div style={styles.empty}>No {activeTab} trades</div>
      ) : (
        <div style={styles.tradesList}>
          {displayTrades.map(trade => (
            <TradeCard
              key={trade.id}
              trade={trade}
              myTeamId={Number(teamId)}
              onAccept={() => respondToTrade(trade.id, true)}
              onDecline={() => respondToTrade(trade.id, false)}
              onVeto={() => vetoTrade(trade.id)}
            />
          ))}
        </div>
      )}

      {showPropose && (
        <ProposeTradeModal
          leagueId={leagueId}
          myTeamId={teamId}
          leagueTeams={leagueTeams.filter(t => String(t.id) !== String(teamId))}
          onClose={() => setShowPropose(false)}
          onProposed={() => { setShowPropose(false); fetchData(); showMsg('success', 'Trade proposal sent!'); }}
          onError={(msg) => showMsg('error', msg)}
        />
      )}
    </div>
  );
};

const TradeCard = ({ trade, myTeamId, onAccept, onDecline, onVeto }) => {
  const isIncoming = trade.receiving_team_id === myTeamId;
  const statusStyle = STATUS_COLORS[trade.status] || STATUS_COLORS.pending;
  const directionColor = isIncoming ? '#60a5fa' : '#a78bfa';

  return (
    <div style={styles.tradeCard}>
      <div style={styles.tradeHeader}>
        <span style={{ color: directionColor, fontSize: '0.8rem', fontWeight: '700' }}>
          {isIncoming ? `Offer from ${trade.proposing_team_name}` : `Offer to ${trade.receiving_team_name}`}
        </span>
        <span style={{ ...styles.statusPill, background: statusStyle.bg, color: statusStyle.text }}>
          {trade.status.toUpperCase()}
        </span>
      </div>

      <div style={styles.tradeBody}>
        <PlayerGroup label="Giving" players={trade.offering_players} color="#ff6b6b" />
        <div style={styles.arrow}><i className="fas fa-exchange-alt" /></div>
        <PlayerGroup label="Getting" players={trade.requesting_players} color="#69db7c" />
      </div>

      {trade.message && (
        <div style={styles.tradeMessage}>"{trade.message}"</div>
      )}

      <div style={styles.tradeFooter}>
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem' }}>
          {new Date(trade.proposed_at).toLocaleDateString()}
        </span>
        {trade.status === 'pending' && isIncoming && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={styles.acceptBtn} onClick={onAccept}>Accept</button>
            <button style={styles.declineBtn} onClick={onDecline}>Decline</button>
            <button style={styles.vetoBtn} onClick={onVeto}>Veto</button>
          </div>
        )}
      </div>
    </div>
  );
};

const PlayerGroup = ({ label, players, color }) => (
  <div style={{ flex: 1 }}>
    <div style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color, letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</div>
    {(players || []).map((p, i) => (
      <div key={i} style={{ fontSize: '0.85rem', color: '#fff', padding: '3px 0' }}>
        {p.player_name} <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem' }}>({p.position})</span>
      </div>
    ))}
  </div>
);

const ProposeTradeModal = ({ leagueId, myTeamId, leagueTeams, onClose, onProposed, onError }) => {
  const [targetTeamId, setTargetTeamId] = useState('');
  const [myRoster, setMyRoster] = useState([]);
  const [theirRoster, setTheirRoster] = useState([]);
  const [offeringIds, setOfferingIds] = useState(new Set());
  const [requestingIds, setRequestingIds] = useState(new Set());
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    pwhlFantasyAPI.getTeamRoster(myTeamId).then(r => setMyRoster(r.data || [])).catch(() => {});
  }, [myTeamId]);

  useEffect(() => {
    if (targetTeamId) {
      pwhlFantasyAPI.getTeamRoster(targetTeamId).then(r => setTheirRoster(r.data || [])).catch(() => {});
    }
  }, [targetTeamId]);

  const toggleId = (set, setter, id) => {
    setter(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handlePropose = async () => {
    if (!targetTeamId) { onError('Select a team to trade with'); return; }
    if (offeringIds.size === 0 || requestingIds.size === 0) { onError('Select players on both sides'); return; }
    setLoading(true);
    try {
      await pwhlFantasyAPI.proposeTrade(leagueId, {
        receiving_team_id: Number(targetTeamId),
        proposing_player_ids: [...offeringIds],
        receiving_player_ids: [...requestingIds],
        message: message.trim() || undefined,
      });
      onProposed();
    } catch (err) {
      onError(err.response?.data?.detail || 'Failed to propose trade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...styles.modalCard, maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={styles.modalHeader}>
          <h3 style={{ margin: 0, color: '#fff' }}>Propose Trade</h3>
          <button onClick={onClose} style={styles.closeBtn}><i className="fas fa-times" /></button>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Trade With</label>
          <select value={targetTeamId} onChange={e => setTargetTeamId(e.target.value)} style={styles.input}>
            <option value="">Select a team...</option>
            {leagueTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div style={styles.twoCol}>
          <PlayerSelectList
            title="Your Players (offering)"
            players={myRoster}
            selectedIds={offeringIds}
            onToggle={(id) => toggleId(offeringIds, setOfferingIds, id)}
            accentColor="#a78bfa"
          />
          <PlayerSelectList
            title="Their Players (requesting)"
            players={theirRoster}
            selectedIds={requestingIds}
            onToggle={(id) => toggleId(requestingIds, setRequestingIds, id)}
            accentColor="#60a5fa"
            disabled={!targetTeamId}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Message (optional)</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Add a note..." style={{ ...styles.input, height: '60px', resize: 'vertical' }} />
        </div>

        <button
          style={{ ...styles.primaryBtn, width: '100%', justifyContent: 'center', opacity: loading ? 0.6 : 1 }}
          onClick={handlePropose}
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send Trade Proposal'}
        </button>
      </div>
    </div>
  );
};

const PlayerSelectList = ({ title, players, selectedIds, onToggle, accentColor, disabled }) => (
  <div style={{ flex: 1 }}>
    <div style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', color: accentColor, letterSpacing: '0.06em', marginBottom: '8px' }}>{title}</div>
    <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
      {disabled ? (
        <div style={{ padding: '16px', color: 'rgba(255,255,255,0.50)', fontSize: '0.82rem' }}>Select a team first</div>
      ) : players.length === 0 ? (
        <div style={{ padding: '16px', color: 'rgba(255,255,255,0.50)', fontSize: '0.82rem' }}>No players</div>
      ) : (
        players.map(p => {
          const isSelected = selectedIds.has(p.player_id);
          return (
            <div
              key={p.player_id}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', cursor: 'pointer', background: isSelected ? `${accentColor}22` : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}
              onClick={() => onToggle(p.player_id)}
            >
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${isSelected ? accentColor : 'rgba(255,255,255,0.3)'}`, background: isSelected ? accentColor : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isSelected && <i className="fas fa-check" style={{ fontSize: '0.6rem', color: '#fff' }} />}
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', color: '#fff', fontWeight: '500' }}>{p.player_name}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)' }}>{p.position} · {(p.fantasy_points||0).toFixed(1)} FP</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  </div>
);

const styles = {
  center: { textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.80)' },
  backBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.80)', cursor: 'pointer', fontSize: '0.875rem', padding: '0 0 0.75rem', display: 'flex', alignItems: 'center' },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  title: { fontSize: '1.4rem', fontWeight: '700', color: '#fff', margin: 0 },
  msgBanner: { padding: '10px 14px', borderRadius: '8px', border: '1px solid', marginBottom: '12px', fontSize: '0.875rem' },
  tabBar: { display: 'flex', gap: '8px', marginBottom: '1.25rem' },
  tab: { padding: '8px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' },
  tabActive: { background: 'rgba(255,124,222,0.15)', borderColor: 'rgba(255,124,222,0.4)', color: 'var(--pink)' },
  badge: { background: 'var(--pink)', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: '700' },
  empty: { textAlign: 'center', padding: '2.5rem', color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)' },
  tradesList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  tradeCard: { background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.09)', padding: '16px 20px' },
  tradeHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  statusPill: { padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '700' },
  tradeBody: { display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' },
  arrow: { color: 'rgba(255,255,255,0.25)', fontSize: '1rem', padding: '4px', flexShrink: 0 },
  tradeMessage: { fontStyle: 'italic', color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '12px', marginBottom: '12px' },
  tradeFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  acceptBtn: { background: 'rgba(0,200,83,0.15)', border: '1px solid rgba(0,200,83,0.3)', color: '#00c853', padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' },
  declineBtn: { background: 'rgba(255,82,82,0.15)', border: '1px solid rgba(255,82,82,0.3)', color: '#ff5252', padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' },
  vetoBtn: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.80)', padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modalCard: { background: '#1e0a3c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '1.5rem', width: '100%' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  closeBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.80)', cursor: 'pointer', fontSize: '1rem' },
  field: { marginBottom: '14px' },
  label: { display: 'block', color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px' },
  input: { width: '100%', padding: '9px 13px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' },
  twoCol: { display: 'flex', gap: '12px', marginBottom: '14px' },
  primaryBtn: { background: 'linear-gradient(135deg, var(--pink), var(--violet))', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center' },
};

export default TradeCenter;
