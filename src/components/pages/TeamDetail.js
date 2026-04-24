import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PlayerAvatar from '../PlayerAvatar';
import PosBadge from '../PosBadge';
import { pwhlLeagueAPI, pwhlPlayersAPI } from '../../services/pwhlAPI';

const STAT_COLS = [
  { key: 'gp',  label: 'GP' },
  { key: 'w',   label: 'W (3 pts)',   color: '#00c853' },
  { key: 'otw', label: 'OTW (2 pts)', color: '#69db7c' },
  { key: 'otl', label: 'OTL (1 pt)',  color: '#ffc107' },
  { key: 'l',   label: 'L (0 pts)',   color: '#ff5252' },
  { key: 'pts', label: 'PTS', color: 'var(--pink)', bold: true },
  { key: 'gf',  label: 'GF' },
  { key: 'ga',  label: 'GA' },
];

// flex:true columns expand to fill available width; fixed columns stay fixed
const SKATER_COLS = [
  { key: 'name',     label: 'Player', width: '200px', flex: false },
  { key: 'jersey',   label: '#',      flex: true },
  { key: 'position', label: 'POS',    flex: true },
  { key: 'gp',       label: 'GP',     flex: true },
  { key: 'goals',    label: 'G',      flex: true },
  { key: 'assists',  label: 'A',      flex: true },
  { key: 'points',   label: 'PTS',    flex: true },
  { key: 'shots',    label: 'SOG',    flex: true },
  { key: 'fantasy',  label: 'FP',     flex: true, highlight: true },
];

const GOALIE_COLS = [
  { key: 'name',     label: 'Player', width: '200px', flex: false },
  { key: 'jersey',   label: '#',      flex: true },
  { key: 'gp',       label: 'GP',     flex: true },
  { key: 'wins',     label: 'W',      flex: true },
  { key: 'save_pct', label: 'SV%',    flex: true },
  { key: 'gaa',      label: 'GAA',    flex: true },
  { key: 'shutouts', label: 'SO',     flex: true },
  { key: 'fantasy',  label: 'FP',     flex: true, highlight: true },
];

const TeamDetail = () => {
  const { abbr } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [standings, setStandings] = useState(null);
  const [roster, setRoster] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('roster');
  const [rosterTab, setRosterTab] = useState('skaters');
  const [sortKey, setSortKey] = useState('fantasy');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (key) => {
    if (!key || key === 'name' || key === 'position') return;
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // First get teams + standings in parallel
        const [teamsRes, standingsRes] = await Promise.all([
          pwhlPlayersAPI.getAllTeams(),
          pwhlLeagueAPI.getStandings({ season: '2025-2026' }),
        ]);

        const allTeams = teamsRes.data || [];
        const found = allTeams.find(t => t.abbreviation?.toUpperCase() === abbr?.toUpperCase());
        if (!found) { setLoading(false); return; }
        setTeam(found);

        const standingRow = (standingsRes.data || []).find(s => s.id === found.id);
        setStandings(standingRow || null);

        // Fetch roster + full season games for this team in parallel
        const [rosterRes, gamesRes] = await Promise.all([
          pwhlLeagueAPI.getTeamRoster(found.id),
          pwhlLeagueAPI.getGames({
            team_id: found.id,
            limit: 100,
            from_date: '2025-10-01',
          }).catch(() => ({ data: [] })),
        ]);

        setRoster(rosterRes.data || []);

        const teamGames = (gamesRes.data || [])
          .sort((a, b) => new Date(b.game_time || b.game_date) - new Date(a.game_time || a.game_date));
        setGames(teamGames);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [abbr]);

  if (loading) return <div style={s.center}>Loading...</div>;
  if (!team)   return <div style={s.center}>Team "{abbr}" not found.</div>;

  const sortPlayers = (players) => {
    const sorted = [...players].sort((a, b) => {
      const av = getNumericVal(a, sortKey);
      const bv = getNumericVal(b, sortKey);
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return sorted;
  };

  const skaters = sortPlayers(roster.filter(p => p.position !== 'G'));
  const goalies  = sortPlayers(roster.filter(p => p.position === 'G'));
  const displayRoster = rosterTab === 'skaters' ? skaters : goalies;
  const cols = rosterTab === 'skaters' ? SKATER_COLS : GOALIE_COLS;

  const primaryColor = team.primary_color || 'var(--pink)';
  const secondaryColor = team.secondary_color || 'rgba(255,255,255,0.1)';

  const getNumericVal = (player, key) => {
    const stats = player.season_stats || {};
    switch (key) {
      case 'jersey':   return player.jersey_number || 0;
      case 'gp':       return stats.games_played ?? 0;
      case 'goals':    return stats.goals ?? 0;
      case 'assists':  return stats.assists ?? 0;
      case 'points':   return (stats.goals ?? 0) + (stats.assists ?? 0);
      case 'shots':    return stats.shots ?? 0;
      case 'wins':     return stats.wins ?? 0;
      case 'save_pct': return stats.save_percentage ?? 0;
      case 'gaa':      return stats.goals_against_average ?? 99;
      case 'shutouts': return stats.shutouts ?? 0;
      case 'fantasy':  return player.fantasy_value ?? 0;
      default:         return 0;
    }
  };

  const getVal = (player, key) => {
    const stats = player.season_stats || {};
    switch (key) {
      case 'name':     return null; // rendered specially
      case 'jersey':   return player.jersey_number ? `#${player.jersey_number}` : '—';
      case 'position': return player.position;
      case 'gp':       return stats.games_played ?? 0;
      case 'goals':    return stats.goals ?? 0;
      case 'assists':  return stats.assists ?? 0;
      case 'points':   return (stats.goals ?? 0) + (stats.assists ?? 0);
      case 'shots':    return stats.shots ?? 0;
      case 'wins':     return stats.wins ?? 0;
      case 'save_pct': return stats.save_percentage != null ? Number(stats.save_percentage).toFixed(3) : '—';
      case 'gaa':      return stats.goals_against_average != null ? Number(stats.goals_against_average).toFixed(2) : '—';
      case 'shutouts': return stats.shutouts ?? 0;
      case 'fantasy':  return (player.fantasy_value ?? 0).toFixed(1);
      default:         return '—';
    }
  };

  return (
    <div style={{ maxWidth: '1000px' }}>
      {/* Back */}
      <button className="pwhl-back-btn" onClick={() => navigate(-1)}>
        <i className="fas fa-chevron-left" />Back
      </button>

      {/* Team hero */}
      <div style={{ ...s.hero, borderBottom: `3px solid ${primaryColor}` }}>
        <div style={{ ...s.heroAccent, background: `linear-gradient(135deg, ${primaryColor}22, ${secondaryColor}11)` }} />
        <div style={s.heroContent}>
          {team.logo_url ? (
            <img src={team.logo_url} alt={team.name} style={s.teamLogo}
              onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <div style={{ ...s.teamLogoPlaceholder, background: primaryColor + '33', color: primaryColor }}>
              {team.abbreviation}
            </div>
          )}
          <div>
            <h1 style={s.teamName}>{team.city} {team.name}</h1>
            <div style={s.teamMeta}>
              <span style={{ ...s.abbrBadge, background: primaryColor + '22', color: primaryColor, border: `1px solid ${primaryColor}44` }}>
                {team.abbreviation}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>PWHL · 2025-26</span>
            </div>
          </div>
        </div>

        {/* Standings stats */}
        {standings && (
          <div style={s.statsRow}>
            {STAT_COLS.map(col => (
              <div key={col.key} style={s.statItem}>
                <div style={{ ...s.statVal, color: col.color || '#fff', fontWeight: col.bold ? '800' : '600' }}>
                  {standings[col.key] ?? 0}
                </div>
                <div style={s.statLabel}>{col.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {[['roster', `Roster (${roster.length})`], ['schedule', `Games (${games.length})${games.length === 100 ? '+' : ''}`]].map(([id, label]) => (
          <button
            key={id}
            style={{ ...s.tab, ...(activeTab === id ? { ...s.tabActive, borderBottomColor: primaryColor, color: primaryColor } : {}) }}
            onClick={() => setActiveTab(id)}
          >{label}</button>
        ))}
      </div>

      {/* Roster tab */}
      {activeTab === 'roster' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {[['skaters', `Skaters (${skaters.length})`], ['goalies', `Goalies (${goalies.length})`]].map(([id, label]) => (
              <button key={id}
                style={{ ...s.subTab, ...(rosterTab === id ? s.subTabActive : {}) }}
                onClick={() => setRosterTab(id)}
              >{label}</button>
            ))}
          </div>

          <div style={s.tableCard}>
            <div className="pwhl-table-scroll">
              <div style={{ minWidth: '480px' }}>
                <div style={s.tableHeader}>
                  {cols.map((col, i) => {
                    const sortable = col.key !== 'name' && col.key !== 'position';
                    const isActive = sortKey === col.key;
                    return (
                      <div
                        key={col.key}
                        style={{
                          ...s.th,
                          ...(col.flex ? { flex: 1, minWidth: '44px' } : { width: col.width, minWidth: col.width }),
                          textAlign: i === 0 ? 'left' : 'center',
                          color: isActive ? 'var(--pink)' : col.highlight ? 'var(--pink)' : 'rgba(255,255,255,0.7)',
                          cursor: sortable ? 'pointer' : 'default',
                          userSelect: 'none',
                        }}
                        onClick={() => handleSort(col.key)}
                      >
                        {col.label}
                        {sortable && isActive && (
                          <i className={`fas fa-caret-${sortDir === 'desc' ? 'down' : 'up'}`}
                            style={{ marginLeft: '4px', fontSize: '0.65rem' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
                {displayRoster.length === 0 ? (
                  <div style={s.empty}>
                    No {rosterTab} found for this team
                    {rosterTab === 'goalies' && ' — goalie data may not yet be in the database'}
                  </div>
                ) : displayRoster.map((player, idx) => (
                  <div key={player.id}
                    style={{ ...s.tableRow, background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)', cursor: 'pointer' }}
                    onClick={() => navigate(`/player/${player.slug || player.id}`)}
                  >
                    {cols.map((col, i) => (
                      <div key={col.key} style={{
                        ...s.td,
                        ...(col.flex ? { flex: 1, minWidth: '44px' } : { width: col.width, minWidth: col.width }),
                        textAlign: i === 0 ? 'left' : 'center',
                        color: col.highlight ? 'var(--pink)' : '#fff',
                        fontWeight: col.highlight ? '700' : i === 0 ? '600' : '400',
                      }}>
                        {col.key === 'name' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <PlayerAvatar src={player.headshot_url} name={`${player.first_name} ${player.last_name}`} position={player.position} size={28} />
                            <div>
                              <div style={{ color: '#fff', fontSize: '0.875rem' }}>{player.first_name} {player.last_name}</div>
                              {player.jersey_number && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>#{player.jersey_number}</div>}
                            </div>
                          </div>
                        ) : col.key === 'position' ? (
                          <PosBadge pos={player.position} />
                        ) : (
                          getVal(player, col.key)
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule tab */}
      {activeTab === 'schedule' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {games.length === 0 ? (
            <div style={s.empty}>No recent games found</div>
          ) : games.map((game, idx) => {
            const isHome = game.home_team === team.abbreviation;
            const oppAbbr = isHome ? game.away_team : game.home_team;
            const oppLogo = isHome ? game.away_logo_url : game.home_logo_url;
            const myScore = isHome ? game.home_score : game.away_score;
            const oppScore = isHome ? game.away_score : game.home_score;
            const isFinal = game.status === 'final';
            const isWin = isFinal && myScore > oppScore;
            const isLoss = isFinal && myScore < oppScore;
            const date = game.game_time || game.game_date;

            return (
              <div key={game.id || idx} style={{ ...s.gameRow, background: idx % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', width: '80px', flexShrink: 0 }}>
                  {date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', width: '28px' }}>{isHome ? 'vs' : '@'}</span>
                  {oppLogo && <img src={oppLogo} alt={oppAbbr} style={{ width: '24px', height: '24px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />}
                  <span style={{ color: '#fff', fontWeight: '500', fontSize: '0.875rem' }}>{oppAbbr}</span>
                </div>
                {isFinal ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '1rem', color: isWin ? '#00c853' : isLoss ? '#ff5252' : 'rgba(255,255,255,0.6)' }}>
                      {myScore}–{oppScore}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: isWin ? '#00c853' : isLoss ? '#ff5252' : 'rgba(255,255,255,0.4)', minWidth: '20px' }}>
                      {isWin ? 'W' : isLoss ? 'L' : 'T'}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.78rem', color: 'var(--pink)', fontWeight: '600' }}>
                    {date ? new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) : 'TBD'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const s = {
  center: { textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' },
  hero: { position: 'relative', borderRadius: '16px 16px 0 0', padding: '24px 24px 20px', marginBottom: '1.5rem', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' },
  heroAccent: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  heroContent: { display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', marginBottom: '20px' },
  teamLogo: { width: '80px', height: '80px', objectFit: 'contain', flexShrink: 0 },
  teamLogoPlaceholder: { width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: '800', flexShrink: 0 },
  teamName: { fontSize: '1.8rem', fontWeight: '800', color: '#fff', margin: '0 0 8px' },
  teamMeta: { display: 'flex', alignItems: 'center', gap: '10px' },
  abbrBadge: { padding: '3px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.06em' },
  statsRow: { display: 'flex', gap: '4px', position: 'relative', flexWrap: 'wrap' },
  statItem: { flex: 1, minWidth: '48px', textAlign: 'center', padding: '8px 4px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' },
  statVal: { fontSize: '1.3rem', lineHeight: 1 },
  statLabel: { fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '3px' },
  tabs: { display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.25rem' },
  tab: { padding: '10px 20px', background: 'none', border: 'none', borderBottom: '2px solid transparent', color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '-1px' },
  tabActive: { color: 'var(--pink)', borderBottomColor: 'var(--pink)' },
  subTab: { padding: '7px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' },
  subTabActive: { background: 'rgba(255,124,222,0.15)', borderColor: 'rgba(255,124,222,0.4)', color: 'var(--pink)' },
  tableCard: { background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' },
  tableHeader: { display: 'flex', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' },
  th: { fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.7)', padding: '0 4px' },
  tableRow: { display: 'flex', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', transition: 'background 0.12s' },
  td: { fontSize: '0.875rem', padding: '0 4px', color: 'rgba(255,255,255,0.88)' },
  empty: { padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' },
  gameRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', transition: 'background 0.12s' },
};

export default TeamDetail;
