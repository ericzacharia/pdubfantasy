import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePwhlAuth } from '../../contexts/PwhlAuthContext';
import { pwhlFantasyAPI } from '../../services/pwhlAPI';

const WaiverWire = () => {
  const { leagueId, teamId } = useParams();
  const navigate = useNavigate();
  const { isPwhlAuthenticated } = usePwhlAuth();
  const [league, setLeague] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [roster, setRoster] = useState([]);
  const [available, setAvailable] = useState([]);
  const [pendingBids, setPendingBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('All');
  const [claimModal, setClaimModal] = useState(null); // { player, type: 'rolling'|'faab' }
  const [message, setMessage] = useState(null);

  const isFaab = league?.waiver_type === 'faab';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leagueRes, teamRes, rosterRes, availRes, bidsRes] = await Promise.all([
        pwhlFantasyAPI.getLeague(leagueId),
        pwhlFantasyAPI.getLeagueTeams(leagueId).then(r => (r.data || []).find(t => String(t.id) === String(teamId))),
        pwhlFantasyAPI.getTeamRoster(teamId).catch(() => ({ data: [] })),
        pwhlFantasyAPI.getWaiverPlayers(leagueId, { limit: 100 }).catch(() => ({ data: [] })),
        pwhlFantasyAPI.getMyBids(leagueId).catch(() => ({ data: [] })),
      ]);
      setLeague(leagueRes.data);
      setMyTeam(teamRes || null);
      setRoster(rosterRes.data || []);
      setAvailable(availRes.data || []);
      setPendingBids(bidsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [leagueId, teamId]);

  useEffect(() => {
    if (isPwhlAuthenticated) fetchData();
  }, [isPwhlAuthenticated, fetchData]);

  const handleClaim = async ({ addPlayer, dropPlayer, bidAmount }) => {
    try {
      if (isFaab) {
        await pwhlFantasyAPI.submitFaabBid(leagueId, {
          add_player_id: addPlayer.id,
          drop_player_id: dropPlayer?.player_id,
          bid_amount: bidAmount,
        });
        showMessage('success', `FAAB bid of $${bidAmount} submitted for ${addPlayer.full_name}`);
      } else {
        await pwhlFantasyAPI.claimWaiver({
          team_id: Number(teamId),
          add_player_id: addPlayer.id,
          drop_player_id: dropPlayer?.player_id,
        });
        showMessage('success', `${addPlayer.full_name} claimed!`);
        await fetchData();
      }
    } catch (err) {
      showMessage('error', err.response?.data?.detail || 'Claim failed');
    }
    setClaimModal(null);
  };

  const cancelBid = async (bidId) => {
    try {
      await pwhlFantasyAPI.cancelBid(bidId);
      setPendingBids(prev => prev.filter(b => b.id !== bidId));
      showMessage('success', 'Bid cancelled');
    } catch (err) {
      showMessage('error', 'Failed to cancel bid');
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const filtered = available.filter(p => {
    const matchesSearch = !search || `${p.full_name} ${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase());
    const matchesPos = posFilter === 'All' || p.position === posFilter || (posFilter === 'F' && ['C','LW','RW'].includes(p.position));
    return matchesSearch && matchesPos;
  });

  if (!isPwhlAuthenticated) return <div style={styles.center}>Sign in to access waivers.</div>;
  if (loading) return <div style={styles.center}>Loading waiver wire...</div>;

  return (
    <div>
      <button style={styles.backBtn} onClick={() => navigate(-1)}>
        <i className="fas fa-chevron-left" style={{ marginRight: '6px' }} />Back
      </button>

      <h2 style={styles.title}>Waiver Wire</h2>

      {/* Team info bar */}
      {myTeam && (
        <div style={styles.infoBar}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Waiver Priority</span>
            <span style={styles.infoValue}>#{myTeam.waiver_priority || '—'}</span>
          </div>
          {isFaab && (
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>FAAB Remaining</span>
              <span style={styles.infoValue}>${myTeam.faab_remaining ?? 100}</span>
            </div>
          )}
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Moves This Week</span>
            <span style={styles.infoValue}>{myTeam.acquisitions_this_week || 0}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Type</span>
            <span style={styles.infoValue}>{isFaab ? 'FAAB' : 'Rolling'}</span>
          </div>
        </div>
      )}

      {message && (
        <div style={{ ...styles.msgBanner, background: message.type === 'success' ? 'rgba(0,200,83,0.12)' : 'rgba(255,82,82,0.12)', borderColor: message.type === 'success' ? 'rgba(0,200,83,0.3)' : 'rgba(255,82,82,0.3)', color: message.type === 'success' ? '#00c853' : '#ff5252' }}>
          {message.text}
        </div>
      )}

      {/* Pending FAAB bids */}
      {isFaab && pendingBids.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <i className="fas fa-gavel" style={{ marginRight: '8px', color: 'var(--pink)' }} />My Pending Bids
          </h3>
          {pendingBids.filter(b => b.status === 'pending').map(bid => (
            <div key={bid.id} style={styles.bidCard}>
              <div>
                <span style={{ color: '#fff', fontWeight: '600' }}>Bid: ${bid.bid_amount}</span>
                <span style={{ color: 'rgba(255,255,255,0.80)', fontSize: '0.8rem', marginLeft: '10px' }}>
                  Adding player #{bid.add_player_id}
                  {bid.drop_player_id && ` · Dropping #${bid.drop_player_id}`}
                </span>
              </div>
              <button style={styles.cancelBtn} onClick={() => cancelBid(bid.id)}>
                <i className="fas fa-times" style={{ marginRight: '5px' }} />Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Available Players */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <i className="fas fa-users" style={{ marginRight: '8px', color: 'var(--pink)' }} />Available Players
        </h3>

        <div style={styles.filterRow}>
          <div style={styles.searchWrapper}>
            <i className="fas fa-search" style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search players..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <div className="pwhl-filter-chips">
            {['All', 'F', 'D', 'G'].map(pos => (
              <button
                key={pos}
                className={`pwhl-chip ${posFilter === pos ? 'active' : ''}`}
                onClick={() => setPosFilter(pos)}
              >{pos}</button>
            ))}
          </div>
        </div>

        <div style={styles.playersList}>
          {filtered.length === 0 ? (
            <div style={styles.empty}>No available players found</div>
          ) : (
            filtered.map(player => (
              <WaiverPlayerRow
                key={player.id}
                player={player}
                isFaab={isFaab}
                onAdd={() => setClaimModal({ player })}
              />
            ))
          )}
        </div>
      </div>

      {/* Claim Modal */}
      {claimModal && (
        <ClaimModal
          player={claimModal.player}
          roster={roster}
          isFaab={isFaab}
          faabRemaining={myTeam?.faab_remaining ?? 100}
          onClose={() => setClaimModal(null)}
          onSubmit={handleClaim}
        />
      )}
    </div>
  );
};

const WaiverPlayerRow = ({ player, isFaab, onAdd }) => {
  const [hovered, setHovered] = useState(false);
  const isGoalie = player.position === 'G';
  return (
    <div
      style={{ ...styles.playerRow, background: hovered ? 'rgba(255,255,255,0.05)' : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={styles.playerInfo}>
        {player.headshot_url && <img src={player.headshot_url} alt="" style={styles.headshot} onError={e => { e.target.style.display = 'none'; }} />}
        <div>
          <div style={{ fontWeight: '600', color: '#fff' }}>{player.full_name}</div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)' }}>
            {player.position} · {player.team_abbreviation}
          </div>
        </div>
      </div>
      <div style={styles.playerStats}>
        {isGoalie ? (<>
          <StatBox label="W" value={player.wins ?? 0} />
          <StatBox label="SV%" value={player.save_percentage != null ? player.save_percentage.toFixed(3) : '—'} />
        </>) : (<>
          <StatBox label="G" value={player.goals ?? 0} />
          <StatBox label="A" value={player.assists ?? 0} />
          <StatBox label="GP" value={player.games_played ?? 0} />
        </>)}
        <StatBox label="FP" value={(player.fantasy_points ?? 0).toFixed(1)} highlight />
      </div>
      <button style={styles.addBtn} onClick={onAdd}>
        {isFaab ? <><i className="fas fa-dollar-sign" style={{ marginRight: '5px' }} />Bid</> : <><i className="fas fa-plus" style={{ marginRight: '5px' }} />Add</>}
      </button>
    </div>
  );
};

const StatBox = ({ label, value, highlight }) => (
  <div style={{ textAlign: 'center', minWidth: '36px' }}>
    <div style={{ fontSize: '0.875rem', fontWeight: highlight ? '700' : '500', color: highlight ? 'var(--pink)' : '#fff' }}>{value}</div>
    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)' }}>{label}</div>
  </div>
);

const ClaimModal = ({ player, roster, isFaab, faabRemaining, onClose, onSubmit }) => {
  const [dropPlayer, setDropPlayer] = useState(null);
  const [bidAmount, setBidAmount] = useState(1);
  const rosterFull = roster.length >= 20;

  return (
    <div style={styles.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modalCard}>
        <div style={styles.modalHeader}>
          <h3 style={{ margin: 0, color: '#fff' }}>{isFaab ? 'Submit FAAB Bid' : 'Add Player'}</h3>
          <button onClick={onClose} style={styles.closeBtn}><i className="fas fa-times" /></button>
        </div>

        <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
          <div style={{ fontWeight: '600', color: '#fff' }}>{player.full_name}</div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)' }}>{player.position} · {player.team_abbreviation} · {(player.fantasy_points||0).toFixed(1)} FP</div>
        </div>

        {isFaab && (
          <div style={styles.field}>
            <label style={styles.label}>Bid Amount (max ${faabRemaining})</label>
            <input
              type="number"
              min={0}
              max={faabRemaining}
              value={bidAmount}
              onChange={e => setBidAmount(Math.min(faabRemaining, Math.max(0, Number(e.target.value))))}
              style={styles.input}
            />
          </div>
        )}

        {rosterFull && (
          <div style={styles.field}>
            <label style={styles.label}>Drop Player (roster full)</label>
            <select value={dropPlayer?.player_id || ''} onChange={e => setDropPlayer(roster.find(p => String(p.player_id) === e.target.value) || null)} style={styles.input}>
              <option value="">Select player to drop...</option>
              {roster.map(p => <option key={p.player_id} value={p.player_id}>{p.player_name} ({p.position})</option>)}
            </select>
          </div>
        )}

        <button
          style={{ ...styles.primaryBtn, width: '100%', justifyContent: 'center', opacity: (rosterFull && !dropPlayer) ? 0.4 : 1 }}
          disabled={rosterFull && !dropPlayer}
          onClick={() => onSubmit({ addPlayer: player, dropPlayer, bidAmount })}
        >
          {isFaab ? `Submit $${bidAmount} Bid` : 'Claim Player'}
        </button>
      </div>
    </div>
  );
};

const styles = {
  center: { textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.80)' },
  backBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.80)', cursor: 'pointer', fontSize: '0.875rem', padding: '0 0 0.75rem', display: 'flex', alignItems: 'center' },
  title: { fontSize: '1.4rem', fontWeight: '700', color: '#fff', marginBottom: '1rem' },
  infoBar: { display: 'flex', gap: '24px', padding: '14px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1rem', flexWrap: 'wrap' },
  infoItem: { display: 'flex', flexDirection: 'column', gap: '2px' },
  infoLabel: { fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  infoValue: { fontSize: '1rem', fontWeight: '700', color: 'var(--pink)' },
  msgBanner: { padding: '10px 14px', borderRadius: '8px', border: '1px solid', marginBottom: '12px', fontSize: '0.875rem' },
  section: { marginBottom: '2rem' },
  sectionTitle: { fontSize: '1.05rem', fontWeight: '600', color: '#fff', marginBottom: '1rem' },
  bidCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '8px' },
  cancelBtn: { background: 'rgba(255,82,82,0.15)', border: '1px solid rgba(255,82,82,0.3)', color: '#ff5252', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  filterRow: { display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' },
  searchWrapper: { position: 'relative', maxWidth: '300px' },
  searchIcon: { position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.50)', fontSize: '0.8rem' },
  searchInput: { padding: '8px 12px 8px 32px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' },
  playersList: { background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' },
  playerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '12px', transition: 'background 0.15s' },
  playerInfo: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 },
  headshot: { width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  playerStats: { display: 'flex', gap: '16px', alignItems: 'center' },
  addBtn: { background: 'linear-gradient(135deg, var(--pink), var(--violet))', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '7px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 },
  empty: { padding: '2.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.55)' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modalCard: { background: '#1e0a3c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '400px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  closeBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.80)', cursor: 'pointer', fontSize: '1rem' },
  field: { marginBottom: '14px' },
  label: { display: 'block', color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px' },
  input: { width: '100%', padding: '9px 13px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' },
  primaryBtn: { background: 'linear-gradient(135deg, var(--pink), var(--violet))', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', marginTop: '8px' },
};

export default WaiverWire;
