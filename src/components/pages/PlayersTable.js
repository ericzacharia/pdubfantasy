import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PlayerAvatar from '../PlayerAvatar';
import { useWatchlist } from '../../hooks/useWatchlist';
import { pwhlPlayersAPI, pwhlFantasyAPI, pwhlLeagueAPI } from '../../services/pwhlAPI';
import { usePwhlAuth } from '../../contexts/PwhlAuthContext';

const POS_COLORS = { C:'#8b5cf6', LW:'#8b5cf6', RW:'#8b5cf6', F:'#8b5cf6', D:'#3b82f6', G:'#f59e0b' };

const PosBadge = ({ pos }) => {
  const color = POS_COLORS[pos] || 'rgba(255,255,255,0.3)';
  return (
    <span style={{ background: color + '22', color, border: `1px solid ${color}55`, borderRadius: '4px', padding: '1px 5px', fontSize: '0.65rem', fontWeight: '700', flexShrink: 0 }}>
      {pos}
    </span>
  );
};

// name col fixed, stat cols flex so they expand to fill available space
const SKATER_COLS = [
  { key: 'name',        label: 'Player',  sortKey: 'name',          width: '220px', flex: false },
  { key: 'gp',          label: 'GP',      sortKey: 'games_played',   flex: true },
  { key: 'goals',       label: 'G',       sortKey: 'goals',          flex: true },
  { key: 'assists',     label: 'A',       sortKey: 'assists',        flex: true },
  { key: 'points',      label: 'PTS',     sortKey: 'points',         flex: true },
  { key: 'plus_minus',  label: '+/-',     sortKey: 'plus_minus',     flex: true },
  { key: 'shots',       label: 'SOG',     sortKey: 'shots',          flex: true },
  { key: 'pim',         label: 'PIM',     sortKey: 'pim',            flex: true },
  { key: 'fantasy',     label: 'FP',      sortKey: 'fantasy_value',  flex: true, highlight: true },
];

const GOALIE_COLS = [
  { key: 'name',        label: 'Player',  sortKey: 'name',          width: '220px', flex: false },
  { key: 'gp',          label: 'GP',      sortKey: 'games_played',   flex: true },
  { key: 'wins',        label: 'W',       sortKey: 'wins',           flex: true },
  { key: 'losses',      label: 'L',       sortKey: 'losses',         flex: true },
  { key: 'save_pct',    label: 'SV%',     sortKey: 'save_pct',       flex: true },
  { key: 'gaa',         label: 'GAA',     sortKey: 'gaa',            flex: true },
  { key: 'shutouts',    label: 'SO',      sortKey: 'shutouts',       flex: true },
  { key: 'fantasy',     label: 'FP',      sortKey: 'fantasy_value',  flex: true, highlight: true },
];

const POSITIONS = ['All', 'C', 'LW', 'RW', 'D', 'G'];
const SEASONS = ['2025-2026', '2024-2025', '2024'];
const QUICK_FILTERS = [
  { label: '⭐ Watchlist', sortBy: null,           special: 'watchlist' },
  { label: '🏒 Top FP',   sortBy: 'fantasy_value' },
  { label: '🥅 Goals',    sortBy: 'goals' },
  { label: '🎯 Assists',  sortBy: 'assists' },
  { label: '💥 Points',   sortBy: 'points' },
];

const PlayersTable = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isPwhlAuthenticated } = usePwhlAuth();
  const { watchlist, toggle: toggleWatch, isWatched } = useWatchlist();
  const [playerType, setPlayerType] = useState('skaters');
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRosterIds, setMyRosterIds] = useState(new Set());
  const [gameTodayIds, setGameTodayIds] = useState(new Set());
  const [perGame, setPerGame] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [search, setSearch] = useState('');
  // Pre-select team from ?team= query param (e.g. from Trends page)
  const [selectedTeam, setSelectedTeam] = useState(searchParams.get('team') || 'All');
  const [selectedPosition, setSelectedPosition] = useState('All');
  const [selectedSeason, setSelectedSeason] = useState('2025-2026');
  const [sortBy, setSortBy] = useState('fantasy_value');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 100;

  useEffect(() => {
    pwhlPlayersAPI.getAllTeams()
      .then(r => setTeams(r.data || []))
      .catch(() => {});
  }, []);

  // Fetch which players are on the user's teams
  useEffect(() => {
    if (!isPwhlAuthenticated) return;
    pwhlFantasyAPI.getMyTeams().then(r => {
      const ids = new Set();
      // For each team, we'd need roster — approximate with team data for now
      setMyRosterIds(ids);
    }).catch(() => {});
  }, [isPwhlAuthenticated]);

  // Fetch players with games today
  useEffect(() => {
    pwhlLeagueAPI.getUpcomingGames().then(r => {
      const today = new Date().toDateString();
      const todayIds = new Set();
      (r.data || []).forEach(game => {
        const gameDate = game.game_date ? new Date(game.game_date + 'T00:00:00').toDateString() : null;
        if (gameDate === today) {
          if (game.home_team_id) todayIds.add(game.home_team_id);
          if (game.away_team_id) todayIds.add(game.away_team_id);
        }
      });
      setGameTodayIds(todayIds);
    }).catch(() => {});
  }, []);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
        season: selectedSeason,
        sort_by: sortBy,
      };
      if (search) params.q = search;

      if (playerType === 'goalies') {
        params.position = 'G';
      } else if (selectedPosition !== 'All') {
        params.position = selectedPosition;
      } else {
        // exclude goalies from skater view
        // backend filters by position; no param = all, so we fetch all and note it
      }
      if (selectedTeam !== 'All') {
        const team = teams.find(t => t.abbreviation === selectedTeam);
        if (team) params.team_id = team.id;
      }

      const res = await pwhlPlayersAPI.getPlayers(params);
      let data = res.data?.players || [];

      // Client-side filter goalies/skaters if backend doesn't support multi-exclude
      if (playerType === 'skaters') {
        data = data.filter(p => p.position !== 'G');
      } else {
        data = data.filter(p => p.position === 'G');
      }

      // Sort client-side by direction
      if (sortDir === 'asc') data = [...data].reverse();

      setPlayers(data);
      setTotal(res.data?.total || data.length);
    } catch (err) {
      console.error('Error fetching players:', err);
    } finally {
      setLoading(false);
    }
  }, [page, selectedSeason, sortBy, sortDir, search, selectedTeam, selectedPosition, playerType, teams]);

  useEffect(() => {
    const timer = setTimeout(fetchPlayers, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchPlayers, search]);

  // Reset to page 1 on filter change
  useEffect(() => { setPage(1); }, [search, selectedTeam, selectedPosition, selectedSeason, playerType, sortBy]);

  const handleSort = (sortKey) => {
    if (!sortKey) return;
    if (sortBy === sortKey) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(sortKey);
      setSortDir('desc');
    }
  };

  const getCellValue = (player, key) => {
    const stats = player.season_stats || {};
    switch (key) {
      case 'name':       return `${player.first_name} ${player.last_name}`;
      case 'team':       return player.team_abbreviation || '—';
      case 'position':   return player.position || '—';
      case 'gp':         return stats.games_played ?? player.games_played ?? 0;
      case 'goals':      return stats.goals ?? 0;
      case 'assists':    return stats.assists ?? 0;
      case 'points':     return stats.points ?? (stats.goals ?? 0) + (stats.assists ?? 0);
      case 'plus_minus': return stats.plus_minus ?? 0;
      case 'shots':      return stats.shots ?? 0;
      case 'pim':        return stats.penalty_minutes ?? 0;
      case 'wins':       return stats.wins ?? 0;
      case 'losses':     return stats.losses ?? 0;
      case 'save_pct':   return stats.save_percentage != null ? stats.save_percentage.toFixed(3) : '—';
      case 'gaa':        return stats.goals_against_average != null ? stats.goals_against_average.toFixed(2) : '—';
      case 'shutouts':   return stats.shutouts ?? 0;
      case 'fantasy':    return (player.fantasy_value ?? 0).toFixed(1);
      default:           return '—';
    }
  };

  const cols = playerType === 'skaters' ? SKATER_COLS : GOALIE_COLS;
  const skaterPositions = POSITIONS.filter(p => p !== 'G');
  const hasActiveFilters = selectedTeam !== 'All' || selectedPosition !== 'All' || search;
  const clearFilters = () => { setSearch(''); setSelectedTeam('All'); setSelectedPosition('All'); };

  // Apply watchlist filter
  const displayPlayers = showWatchlist
    ? players.filter(p => isWatched(p.id))
    : players;

  // Per-game conversion
  const applyPerGame = (val, gp) => {
    if (!perGame || !gp || gp === 0) return val;
    return typeof val === 'number' ? (val / gp).toFixed(2) : val;
  };

  return (
    <div>
      {/* Quick filter chips */}
      <div className="pwhl-filter-chips" style={{ marginBottom: '10px' }}>
        {QUICK_FILTERS.map(qf => (
          <button
            key={qf.special || qf.sortBy}
            className={`pwhl-chip ${qf.special === 'watchlist' ? (showWatchlist ? 'active' : '') : (sortBy === qf.sortBy ? 'active' : '')}`}
            onClick={() => {
              if (qf.special === 'watchlist') { setShowWatchlist(w => !w); return; }
              setSortBy(qf.sortBy);
              setSortDir('desc');
              if (['goals','assists','points'].includes(qf.sortBy)) setPlayerType('skaters');
            }}
            aria-pressed={qf.special === 'watchlist' ? showWatchlist : sortBy === qf.sortBy}
          >
            {qf.label}
            {qf.special === 'watchlist' && watchlist.size > 0 && (
              <span style={{ marginLeft: '5px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '0 6px', fontSize: '0.65rem', fontWeight: '700' }}>
                {watchlist.size}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
        {/* Skaters/Goalies */}
        <div style={styles.typeToggle}>
          {['skaters', 'goalies'].map(t => (
            <button key={t} style={{ ...styles.toggleBtn, ...(playerType === t ? styles.toggleBtnActive : {}) }}
              onClick={() => { setPlayerType(t); setSelectedPosition('All'); }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Per game toggle */}
        <button
          style={{ ...styles.toggleBtn, ...(perGame ? styles.toggleBtnActive : {}), padding: '6px 12px', fontSize: '0.8rem' }}
          onClick={() => setPerGame(p => !p)}
          title="Toggle between season totals and per-game averages"
        >
          {perGame ? 'Per Game' : 'Totals'}
        </button>

        {/* Season */}
        <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)} style={styles.select}>
          {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Active filter badges + clear */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {selectedTeam !== 'All' && (
              <span className="pwhl-badge pwhl-badge-pink" style={{ cursor: 'pointer' }} onClick={() => setSelectedTeam('All')}>
                {selectedTeam} <i className="fas fa-times" style={{ marginLeft: '3px', fontSize: '0.6rem' }} />
              </span>
            )}
            {selectedPosition !== 'All' && (
              <span className="pwhl-badge pwhl-badge-pink" style={{ cursor: 'pointer' }} onClick={() => setSelectedPosition('All')}>
                {selectedPosition} <i className="fas fa-times" style={{ marginLeft: '3px', fontSize: '0.6rem' }} />
              </span>
            )}
            <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer', padding: '2px 6px' }}>
              Clear all
            </button>
          </div>
        )}

        {/* Results count */}
        <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-faint)' }}>
          {loading ? '…' : `${displayPlayers.length} players`}
        </span>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '10px', maxWidth: '360px' }}>
        <div className="pwhl-search-wrap">
          <i className="fas fa-search icon" />
          <input
            className="pwhl-input"
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search players"
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}
              aria-label="Clear search">
              <i className="fas fa-times" />
            </button>
          )}
        </div>
      </div>

      {/* Team filter chips */}
      <div className="pwhl-filter-chips" style={{ marginBottom: '8px' }}>
        {['All', ...teams.map(t => t.abbreviation)].map(abbr => (
          <button
            key={abbr}
            className={`pwhl-chip ${selectedTeam === abbr ? 'active' : ''}`}
            onClick={() => setSelectedTeam(abbr)}
          >
            {abbr}
          </button>
        ))}
      </div>

      {/* Position filter chips (skaters only) */}
      {playerType === 'skaters' && (
        <div className="pwhl-filter-chips" style={{ marginBottom: '1rem' }}>
          {skaterPositions.map(pos => (
            <button
              key={pos}
              className={`pwhl-chip ${selectedPosition === pos ? 'active' : ''}`}
              onClick={() => setSelectedPosition(pos)}
            >
              {pos}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={styles.tableCard}>
        <div className="pwhl-table-scroll">
          <div style={{ minWidth: '480px' }}>
            {/* Header */}
            <div style={styles.tableHeader}>
              {cols.map(col => (
                <div
                  key={col.key}
                  style={{
                    ...styles.th,
                    ...(col.flex ? { flex: 1, minWidth: '44px' } : { width: col.width, minWidth: col.width }),
                    cursor: col.sortKey ? 'pointer' : 'default',
                    color: sortBy === col.sortKey ? 'var(--pink)' : col.highlight ? 'var(--pink)' : 'rgba(255,255,255,0.80)',
                    textAlign: col.key === 'name' ? 'left' : 'center',
                  }}
                  onClick={() => handleSort(col.sortKey)}
                  aria-sort={sortBy === col.sortKey ? (sortDir === 'desc' ? 'descending' : 'ascending') : undefined}
                >
                  {col.label}
                  {col.sortKey && sortBy === col.sortKey && (
                    <i
                      className={`fas fa-caret-${sortDir === 'desc' ? 'down' : 'up'}`}
                      style={{ marginLeft: '4px', fontSize: '0.7rem' }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Rows */}
            {loading ? (
              <div style={styles.loadingRow}><i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }} />Loading players...</div>
            ) : displayPlayers.length === 0 ? (
              <div className="pwhl-empty">
                <div className="icon"><i className="fas fa-search" /></div>
                <div className="label">{showWatchlist ? 'No players in your watchlist yet — star players to save them' : 'No players found — try adjusting your filters'}</div>
              </div>
            ) : (
              displayPlayers.map((player, idx) => (
                <PlayerRow key={player.id} player={player} cols={cols} getCellValue={getCellValue} idx={idx} navigate={navigate}
                  isWatched={isWatched(player.id)} onToggleWatch={(e) => { e.stopPropagation(); toggleWatch(player.id); }}
                  hasGameToday={gameTodayIds.has(player.pwhl_team_id)}
                  perGame={perGame} applyPerGame={applyPerGame}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div style={styles.pagination}>
          <button
            style={{ ...styles.pageBtn, opacity: page <= 1 ? 0.4 : 1 }}
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            <i className="fas fa-chevron-left" />
          </button>
          <span style={styles.pageInfo}>
            Page {page} of {Math.ceil(total / PAGE_SIZE)}
          </span>
          <button
            style={{ ...styles.pageBtn, opacity: page >= Math.ceil(total / PAGE_SIZE) ? 0.4 : 1 }}
            disabled={page >= Math.ceil(total / PAGE_SIZE)}
            onClick={() => setPage(p => p + 1)}
          >
            <i className="fas fa-chevron-right" />
          </button>
        </div>
      )}
    </div>
  );
};

const PlayerRow = ({ player, cols, getCellValue, idx, navigate, isWatched, onToggleWatch, hasGameToday, perGame, applyPerGame }) => {
  const [hovered, setHovered] = useState(false);
  const gp = player.season_stats?.games_played || 1;

  return (
    <div
      style={{
        ...styles.tableRow,
        background: hovered ? 'rgba(255,255,255,0.06)' : (idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)'),
        cursor: 'pointer',
      }}
      onClick={() => navigate(`/player/${player.slug || player.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {cols.map(col => (
        <div
          key={col.key}
          style={{
            ...styles.td,
            ...(col.flex ? { flex: 1, minWidth: '44px' } : { width: col.width, minWidth: col.width }),
            textAlign: col.key === 'name' ? 'left' : 'center',
            color: col.highlight || col.key === 'fantasy' ? 'var(--pink)' : col.key === 'name' ? '#fff' : 'rgba(255,255,255,0.88)',
            fontWeight: col.highlight || col.key === 'fantasy' ? '700' : col.key === 'name' ? '600' : '400',
          }}
        >
          {col.key === 'name' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <PlayerAvatar src={player.headshot_url} name={getCellValue(player, 'name')} position={player.position} size={28} />
                {hasGameToday && (
                  <span className="pwhl-dot-live" style={{ position: 'absolute', bottom: 0, right: 0, width: '7px', height: '7px', border: '1px solid rgba(0,0,0,0.5)' }} title="Game today" />
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: hovered ? 'var(--pink)' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.15s' }}>
                    {getCellValue(player, 'name')}
                  </span>
                  <PosBadge pos={player.position} />
                </div>
                <div
                  style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '1px', cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); navigate(`/team/${player.team_abbreviation}`); }}
                  title={`View ${player.team_abbreviation} team page`}
                >{player.team_abbreviation}</div>
              </div>
              {/* Watchlist star — visible on hover or when active */}
              {(hovered || isWatched) && (
                <button
                  className={`pwhl-star ${isWatched ? 'active' : ''}`}
                  onClick={onToggleWatch}
                  aria-label={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
                  title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
                >
                  <i className={isWatched ? 'fas fa-star' : 'far fa-star'} />
                </button>
              )}
              {hovered && !isWatched && <i className="fas fa-chevron-right" style={{ fontSize: '0.65rem', color: 'var(--text-faint)', flexShrink: 0 }} />}
            </div>
          ) : col.key === 'team' ? null : (
            (() => {
              const raw = getCellValue(player, col.key);
              if (perGame && col.key !== 'gaa' && col.key !== 'save_pct' && col.key !== 'fantasy' && raw !== '—') {
                const num = parseFloat(raw);
                return isNaN(num) ? raw : applyPerGame(num, gp);
              }
              return raw;
            })()
          )}
        </div>
      ))}
    </div>
  );
};

const styles = {
  controls: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  typeToggle: {
    display: 'flex',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '8px',
    padding: '3px',
  },
  toggleBtn: {
    padding: '6px 18px',
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: 'rgba(255,255,255,0.80)',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  toggleBtnActive: {
    background: 'rgba(255,124,222,0.2)',
    color: 'var(--pink)',
  },
  select: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#fff',
    padding: '6px 12px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  searchRow: {
    marginBottom: '12px',
  },
  searchWrapper: {
    position: 'relative',
    maxWidth: '360px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'rgba(255,255,255,0.55)',
    fontSize: '0.85rem',
  },
  searchInput: {
    width: '100%',
    padding: '9px 36px 9px 36px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  clearBtn: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.65)',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  tableCard: {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    padding: '10px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
  },
  th: {
    fontSize: '0.75rem',
    fontWeight: '700',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    padding: '0 4px',
    userSelect: 'none',
    transition: 'color 0.2s',
  },
  tableRow: {
    display: 'flex',
    padding: '9px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    alignItems: 'center',
    transition: 'background 0.15s ease',
  },
  td: {
    fontSize: '0.875rem',
    padding: '0 4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  headshot: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    objectFit: 'cover',
    background: 'rgba(255,255,255,0.1)',
    flexShrink: 0,
  },
  loadingRow: {
    padding: '2rem',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.65)',
    fontSize: '0.9rem',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    marginTop: '16px',
  },
  pageBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '6px',
    color: '#fff',
    padding: '6px 12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  pageInfo: {
    color: 'rgba(255,255,255,0.80)',
    fontSize: '0.875rem',
  },
};

export default PlayersTable;
