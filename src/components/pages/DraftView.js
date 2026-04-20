import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePwhlAuth } from '../../contexts/PwhlAuthContext';
import { pwhlFantasyAPI } from '../../services/pwhlAPI';

const DraftView = () => {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { isPwhlAuthenticated } = usePwhlAuth();
  const [draftState, setDraftState] = useState(null);
  const [available, setAvailable] = useState([]);
  const [myTeamId, setMyTeamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('All');
  const [message, setMessage] = useState(null);
  const [showBoard, setShowBoard] = useState(false);

  const fetchDraft = useCallback(async () => {
    try {
      const [draftRes, teamsRes, availRes, myTeamsRes] = await Promise.all([
        pwhlFantasyAPI.getDraftState(leagueId),
        pwhlFantasyAPI.getLeagueTeams(leagueId).catch(() => ({ data: [] })),
        pwhlFantasyAPI.getAvailablePlayers(leagueId).catch(() => ({ data: [] })),
        pwhlFantasyAPI.getMyTeams().catch(() => ({ data: [] })),
      ]);
      setDraftState(draftRes.data);
      setAvailable(availRes.data || []);

      const mine = (myTeamsRes.data || []).find(t => String(t.league_id) === String(leagueId));
      setMyTeamId(mine?.id || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    if (isPwhlAuthenticated) fetchDraft();
  }, [isPwhlAuthenticated, fetchDraft]);

  // Poll when draft is in progress
  useEffect(() => {
    if (draftState?.status !== 'in_progress') return;
    const interval = setInterval(fetchDraft, 8000);
    return () => clearInterval(interval);
  }, [draftState?.status, fetchDraft]);

  const makePick = async (playerId) => {
    setPicking(true);
    try {
      await pwhlFantasyAPI.makeDraftPick(leagueId, playerId);
      showMsg('success', 'Pick submitted!');
      await fetchDraft();
    } catch (err) {
      showMsg('error', err.response?.data?.detail || 'Failed to make pick');
    } finally {
      setPicking(false);
    }
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const isMyTurn = draftState?.current_team_id && String(draftState.current_team_id) === String(myTeamId);

  const filtered = available.filter(p => {
    const matchesSearch = !search || `${p.full_name || ''} ${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchesPos = posFilter === 'All' || p.position === posFilter || (posFilter === 'F' && ['C','LW','RW'].includes(p.position));
    return matchesSearch && matchesPos;
  });

  const myPicks = draftState?.picks?.filter(pick => String(pick.fantasy_team_id) === String(myTeamId)) || [];

  if (!isPwhlAuthenticated) return <div style={styles.center}>Sign in to access the draft.</div>;
  if (loading) return <div style={styles.center}>Loading draft...</div>;
  if (!draftState) return <div style={styles.center}>Draft not found.</div>;

  return (
    <div>
      <button style={styles.backBtn} onClick={() => navigate(`/pwhl/leagues/${leagueId}`)}>
        <i className="fas fa-chevron-left" style={{ marginRight: '6px' }} />League
      </button>

      {/* Draft Status Header */}
      <div style={styles.draftHeader}>
        <div>
          <h2 style={styles.title}>Draft Room</h2>
          <div style={styles.meta}>
            {draftState.status === 'pending' && <span style={{ color: '#ffc107' }}>Draft hasn't started</span>}
            {draftState.status === 'in_progress' && (
              <span>
                Round {Math.ceil((draftState.current_pick_number || 1) / Math.max(1, draftState.draft_order?.length || 1))} ·
                Pick {draftState.current_pick_number || 1} of {draftState.total_picks}
              </span>
            )}
            {draftState.status === 'completed' && <span style={{ color: '#00c853' }}>Draft complete</span>}
          </div>
        </div>
        {draftState.status === 'in_progress' && (
          <div style={{ textAlign: 'right' }}>
            <div style={styles.turnIndicator}>
              {isMyTurn ? (
                <span style={{ color: '#00c853', fontWeight: '700' }}>
                  <i className="fas fa-circle" style={{ marginRight: '6px', fontSize: '0.7rem', animation: 'pulse 1s infinite' }} />
                  Your Pick!
                </span>
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.80)' }}>Waiting for other team...</span>
              )}
            </div>
          </div>
        )}
      </div>

      {message && (
        <div style={{ ...styles.msgBanner, background: message.type === 'success' ? 'rgba(0,200,83,0.12)' : 'rgba(255,82,82,0.12)', borderColor: message.type === 'success' ? 'rgba(0,200,83,0.3)' : 'rgba(255,82,82,0.3)', color: message.type === 'success' ? '#00c853' : '#ff5252' }}>
          {message.text}
        </div>
      )}

      <div style={styles.twoPanel}>
        {/* Available Players */}
        <div style={styles.mainPanel}>
          <h3 style={styles.panelTitle}>
            Available Players
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: '400', marginLeft: '8px' }}>
              ({available.length} remaining)
            </span>
          </h3>

          <div style={styles.filterRow}>
            <div style={styles.searchWrapper}>
              <i className="fas fa-search" style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <div className="pwhl-filter-chips">
              {['All','F','D','G'].map(pos => (
                <button key={pos} className={`pwhl-chip ${posFilter === pos ? 'active' : ''}`} onClick={() => setPosFilter(pos)}>{pos}</button>
              ))}
            </div>
          </div>

          <div style={styles.playerList}>
            {filtered.slice(0, 60).map(player => (
              <DraftPlayerRow
                key={player.id}
                player={player}
                canPick={isMyTurn && draftState.status === 'in_progress' && !picking}
                onPick={() => makePick(player.id)}
              />
            ))}
            {filtered.length === 0 && <div style={styles.empty}>No players found</div>}
          </div>
        </div>

        {/* Sidebar: My Picks + Recent Picks */}
        <div style={styles.sidebar}>
          <div style={styles.sideSection}>
            <h3 style={styles.panelTitle}>My Picks ({myPicks.length})</h3>
            {myPicks.length === 0 ? (
              <div style={styles.sideEmpty}>No picks yet</div>
            ) : (
              myPicks.map(pick => (
                <div key={pick.pick_number} style={styles.pickRow}>
                  <span style={{ color: 'rgba(255,255,255,0.50)', fontSize: '0.75rem', minWidth: '24px' }}>#{pick.pick_number}</span>
                  <span style={{ color: '#fff', fontSize: '0.85rem', flex: 1 }}>{pick.player_name || `Player #${pick.player_id}`}</span>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem' }}>{pick.position || ''}</span>
                </div>
              ))
            )}
          </div>

          {draftState.picks?.length > 0 && (
            <div style={styles.sideSection}>
              <button
                style={styles.toggleBoardBtn}
                onClick={() => setShowBoard(!showBoard)}
              >
                <i className={`fas fa-chevron-${showBoard ? 'up' : 'down'}`} style={{ marginRight: '6px' }} />
                {showBoard ? 'Hide' : 'Show'} Draft Board ({draftState.picks.length} picks)
              </button>
              {showBoard && draftState.picks.slice(-20).reverse().map(pick => (
                <div key={pick.pick_number} style={styles.boardRow}>
                  <span style={{ color: 'rgba(255,255,255,0.50)', fontSize: '0.72rem', minWidth: '24px' }}>#{pick.pick_number}</span>
                  <span style={{ color: '#fff', fontSize: '0.8rem', flex: 1 }}>{pick.player_name || `Player #${pick.player_id}`}</span>
                  <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', textAlign: 'right' }}>{pick.team_name || ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DraftPlayerRow = ({ player, canPick, onPick }) => {
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
          <div style={{ fontWeight: '600', color: '#fff', fontSize: '0.875rem' }}>{player.full_name || `${player.first_name} ${player.last_name}`}</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}>{player.position} · {player.team_abbreviation}</div>
        </div>
      </div>
      <div style={styles.statRow}>
        {isGoalie ? (<>
          <MiniStat label="W" value={player.wins ?? 0} />
          <MiniStat label="SV%" value={player.save_percentage != null ? player.save_percentage.toFixed(3) : '—'} />
        </>) : (<>
          <MiniStat label="G" value={player.goals ?? 0} />
          <MiniStat label="A" value={player.assists ?? 0} />
        </>)}
        <MiniStat label="FP" value={(player.fantasy_points ?? 0).toFixed(1)} highlight />
      </div>
      {canPick && (
        <button style={styles.pickBtn} onClick={onPick}>Pick</button>
      )}
    </div>
  );
};

const MiniStat = ({ label, value, highlight }) => (
  <div style={{ textAlign: 'center', minWidth: '32px' }}>
    <div style={{ fontSize: '0.82rem', fontWeight: highlight ? '700' : '400', color: highlight ? 'var(--pink)' : '#fff' }}>{value}</div>
    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.50)' }}>{label}</div>
  </div>
);

const styles = {
  center: { textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.80)' },
  backBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.80)', cursor: 'pointer', fontSize: '0.875rem', padding: '0 0 0.75rem', display: 'flex', alignItems: 'center' },
  draftHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' },
  title: { fontSize: '1.4rem', fontWeight: '700', color: '#fff', margin: '0 0 4px' },
  meta: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.80)' },
  turnIndicator: { fontSize: '0.875rem' },
  msgBanner: { padding: '10px 14px', borderRadius: '8px', border: '1px solid', marginBottom: '12px', fontSize: '0.875rem' },
  twoPanel: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', alignItems: 'start' },
  mainPanel: {},
  sidebar: {},
  panelTitle: { fontSize: '1rem', fontWeight: '600', color: '#fff', marginBottom: '12px' },
  filterRow: { display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' },
  searchWrapper: { position: 'relative', maxWidth: '240px' },
  searchIcon: { position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.50)', fontSize: '0.8rem' },
  searchInput: { padding: '8px 12px 8px 32px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' },
  playerList: { background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', maxHeight: '600px', overflowY: 'auto' },
  playerRow: { display: 'flex', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '12px', transition: 'background 0.15s' },
  playerInfo: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 },
  headshot: { width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  statRow: { display: 'flex', gap: '12px' },
  pickBtn: { background: 'linear-gradient(135deg, var(--pink), var(--violet))', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', flexShrink: 0 },
  empty: { padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.55)' },
  sideSection: { background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', padding: '14px', marginBottom: '14px' },
  sideEmpty: { color: 'rgba(255,255,255,0.50)', fontSize: '0.82rem', textAlign: 'center', padding: '8px' },
  pickRow: { display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  boardRow: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  toggleBoardBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.80)', cursor: 'pointer', fontSize: '0.82rem', padding: '0 0 10px', display: 'flex', alignItems: 'center', width: '100%' },
};

export default DraftView;
