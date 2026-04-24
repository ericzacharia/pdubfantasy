import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { pwhlLeagueAPI, pwhlPlayersAPI } from '../../services/pwhlAPI';

const DEFAULT_UPCOMING = 5;
const STEP = 10;
// 2025-26 regular season opened November 21, 2025
const REGULAR_SEASON_START = new Date('2025-11-21T00:00:00');
const DEFAULT_RESULTS  = 5;

const ScheduleView = () => {
  const navigate = useNavigate();
  const [upcoming, setUpcoming]           = useState([]);
  const [results, setResults]             = useState([]);
  const [teams, setTeams]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedTeam, setSelectedTeam]   = useState('All');
  const [upcomingLimit, setUpcomingLimit] = useState(DEFAULT_UPCOMING);
  const [showAllResults, setShowAllResults]   = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [upRes, resRes, teamsRes] = await Promise.all([
          pwhlLeagueAPI.getUpcomingGames().catch(() => ({ data: [] })),
          pwhlLeagueAPI.getGames({ status: 'final', limit: 200, from_date: '2025-10-01' }).catch(() => ({ data: [] })),
          pwhlPlayersAPI.getAllTeams().catch(() => ({ data: [] })),
        ]);

        // Upcoming: soonest first
        const up = (upRes.data || []).sort(
          (a, b) => new Date(a.game_time || a.game_date) - new Date(b.game_time || b.game_date)
        );
        // Results: most recent first
        const res = (resRes.data || []).sort(
          (a, b) => new Date(b.game_time || b.game_date) - new Date(a.game_time || a.game_date)
        );

        setUpcoming(up);
        setResults(res);
        setTeams(teamsRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Filter both sections by team
  const filterGames = (games) => {
    if (selectedTeam === 'All') return games;
    return games.filter(g =>
      g.home_team === selectedTeam || g.away_team === selectedTeam
    );
  };

  const filteredUpcoming = useMemo(() => filterGames(upcoming), [upcoming, selectedTeam]);
  const filteredResults  = useMemo(() => filterGames(results),  [results, selectedTeam]);

  const visibleUpcoming = filteredUpcoming.slice(0, upcomingLimit);
  const visibleResults  = showAllResults  ? filteredResults  : filteredResults.slice(0, DEFAULT_RESULTS);

  if (loading) return <div style={s.loading}><i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }} />Loading schedule...</div>;

  return (
    <div>
      {/* Team filter */}
      <div className="pwhl-filter-chips" style={{ marginBottom: '1.25rem' }}>
        <button className={`pwhl-chip ${selectedTeam === 'All' ? 'active' : ''}`}
          onClick={() => { setSelectedTeam('All'); setUpcomingLimit(DEFAULT_UPCOMING); setShowAllResults(false); }}>
          All Teams
        </button>
        {teams.map(t => (
          <button key={t.abbreviation}
            className={`pwhl-chip ${selectedTeam === t.abbreviation ? 'active' : ''}`}
            onClick={() => { setSelectedTeam(t.abbreviation); setUpcomingLimit(DEFAULT_UPCOMING); setShowAllResults(false); }}
            title={t.name}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            {t.logo_url && <img src={t.logo_url} alt={t.abbreviation} style={{ width: '14px', height: '14px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />}
            {t.abbreviation}
          </button>
        ))}
      </div>

      {/* ── Upcoming ── */}
      <div style={s.sectionHeader}>
        <span style={s.sectionTitle}>
          <i className="fas fa-calendar-alt" style={{ marginRight: '8px', color: 'var(--pink)' }} />
          Upcoming{selectedTeam !== 'All' ? ` · ${selectedTeam}` : ''}
        </span>
        <span style={s.sectionCount}>{filteredUpcoming.length} game{filteredUpcoming.length !== 1 ? 's' : ''}</span>
      </div>

      {filteredUpcoming.length === 0 ? (
        <div style={s.empty}>No upcoming games{selectedTeam !== 'All' ? ` for ${selectedTeam}` : ''}</div>
      ) : (
        <>
          <div style={s.gameList}>
            {visibleUpcoming.map((game, idx) => <GameCard key={game.id || idx} game={game} navigate={navigate} />)}
          </div>
          {filteredUpcoming.length > upcomingLimit && (
            <button style={s.expandBtn} onClick={() => setUpcomingLimit(v => Math.min(v + STEP, filteredUpcoming.length))}>
              <i className="fas fa-chevron-down" style={{ marginRight: '6px' }} />
              Show {Math.min(STEP, filteredUpcoming.length - upcomingLimit)} more
              <span style={{ marginLeft: '4px', color: 'rgba(255,255,255,0.3)' }}>
                ({upcomingLimit} of {filteredUpcoming.length})
              </span>
            </button>
          )}
          {upcomingLimit > DEFAULT_UPCOMING && (
            <button style={{ ...s.expandBtn, marginTop: '4px' }} onClick={() => setUpcomingLimit(DEFAULT_UPCOMING)}>
              <i className="fas fa-chevron-up" style={{ marginRight: '6px' }} />
              Show fewer
            </button>
          )}
        </>
      )}

      <div style={s.divider} />

      {/* ── Results ── */}
      <div style={s.sectionHeader}>
        <span style={s.sectionTitle}>
          <i className="fas fa-flag-checkered" style={{ marginRight: '8px', color: 'rgba(255,255,255,0.5)' }} />
          Results{selectedTeam !== 'All' ? ` · ${selectedTeam}` : ''}
        </span>
        <span style={s.sectionCount}>{filteredResults.length} game{filteredResults.length !== 1 ? 's' : ''}</span>
      </div>

      {filteredResults.length === 0 ? (
        <div style={s.empty}>No results yet{selectedTeam !== 'All' ? ` for ${selectedTeam}` : ''}</div>
      ) : (
        <>
          <div style={s.gameList}>
            {visibleResults.map((game, idx) => <GameCard key={game.id || idx} game={game} navigate={navigate} />)}
          </div>
          {filteredResults.length > DEFAULT_RESULTS && (
            <button style={s.expandBtn} onClick={() => setShowAllResults(v => !v)}>
              <i className={`fas fa-chevron-${showAllResults ? 'up' : 'down'}`} style={{ marginRight: '6px' }} />
              {showAllResults ? 'Show fewer' : `Show all ${filteredResults.length} results`}
            </button>
          )}
        </>
      )}
    </div>
  );
};

const GameCard = ({ game, navigate }) => {
  const [hovered, setHovered] = useState(false);
  const isFinal    = game.status === 'final';
  const isLive     = game.status === 'live';
  const isUpcoming = !isFinal && !isLive;
  const gameDate   = new Date(game.game_time || game.game_date || 0);
  const isPreseason = gameDate < REGULAR_SEASON_START;

  const dateStr = (() => {
    const d = game.game_time || game.game_date;
    if (!d) return '—';
    const dt = new Date(d);
    const today    = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const gameDay  = new Date(dt); gameDay.setHours(0,0,0,0);
    if (gameDay.getTime() === today.getTime())    return 'Today';
    if (gameDay.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  })();

  const timeStr = (() => {
    if (!game.game_time) return '';
    try { return new Date(game.game_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }); }
    catch { return ''; }
  })();

  return (
    <div
      style={{ ...s.card, background: hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Date label */}
      <div style={s.dateCol}>
        <div style={{ fontWeight: '600', color: isUpcoming ? 'var(--pink)' : 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{dateStr}</div>
        {isUpcoming && timeStr && <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{timeStr}</div>}
        {isFinal && <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>FINAL{game.is_overtime ? ' (OT)' : ''}</div>}
        {isLive  && <div style={{ fontSize: '0.68rem', color: '#ff4444', fontWeight: '700', marginTop: '2px' }}>LIVE</div>}
        {isPreseason && (
          <div style={{ fontSize: '0.62rem', fontWeight: '700', color: '#a78bfa', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '4px', padding: '1px 5px', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-block' }}>
            Preseason
          </div>
        )}
      </div>

      {/* Away team */}
      <TeamBlock
        abbr={game.away_team}
        name={game.away_team_name}
        logo={game.away_logo_url}
        score={game.away_score}
        showScore={isFinal || isLive}
        isWinner={isFinal && game.away_score > game.home_score}
        navigate={navigate}
      />

      {/* VS / Score divider */}
      <div style={s.centerCol}>
        {isFinal || isLive ? (
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff' }}>{game.away_score ?? 0}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 6px' }}>–</span>
            <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff' }}>{game.home_score ?? 0}</span>
          </div>
        ) : (
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', fontWeight: '600' }}>VS</span>
        )}
      </div>

      {/* Home team */}
      <TeamBlock
        abbr={game.home_team}
        name={game.home_team_name}
        logo={game.home_logo_url}
        score={game.home_score}
        showScore={isFinal || isLive}
        isWinner={isFinal && game.home_score > game.away_score}
        navigate={navigate}
        alignRight
      />

      {/* Venue */}
      {isUpcoming && game.venue && (
        <div style={s.venueCol}>{game.venue}</div>
      )}
    </div>
  );
};

const TeamBlock = ({ abbr, name, logo, score, showScore, isWinner, navigate, alignRight }) => (
  <div
    style={{ ...s.teamBlock, flexDirection: alignRight ? 'row-reverse' : 'row', textAlign: alignRight ? 'right' : 'left', cursor: abbr ? 'pointer' : 'default' }}
    onClick={() => abbr && navigate(`/team/${abbr}`)}
    title={name || abbr}
  >
    {logo ? (
      <img src={logo} alt={abbr} style={s.logo} onError={e => { e.target.style.display = 'none'; }} />
    ) : (
      <div style={s.logoPlaceholder}>{abbr?.slice(0, 2)}</div>
    )}
    <div>
      <div style={{ fontWeight: isWinner ? '700' : '500', color: isWinner ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
        {name || abbr}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>{abbr}</div>
    </div>
  </div>
);

const s = {
  loading:       { textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' },
  empty:         { padding: '1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '8px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  sectionTitle:  { fontSize: '1rem', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center' },
  sectionCount:  { fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' },
  divider:       { height: '1px', background: 'rgba(255,255,255,0.07)', margin: '20px 0' },
  gameList:      { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' },
  card:          { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.15s' },
  dateCol:       { minWidth: '64px', flexShrink: 0 },
  centerCol:     { flexShrink: 0, width: '72px', display: 'flex', justifyContent: 'center' },
  venueCol:      { fontSize: '0.7rem', color: 'rgba(255,255,255,0.28)', marginLeft: 'auto', textAlign: 'right', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  teamBlock:     { display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 },
  logo:          { width: '32px', height: '32px', objectFit: 'contain', flexShrink: 0 },
  logoPlaceholder: { width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '700', color: 'rgba(255,255,255,0.4)', flexShrink: 0 },
  expandBtn:     { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '8px' },
};

export default ScheduleView;
