import React, { useState, useEffect, useCallback } from 'react';
import { pwhlPlayersAPI } from '../../services/pwhlAPI';

const SKATER_COLS = [
  { key: 'name',        label: 'Player',  sortKey: 'name',          width: '180px', sticky: true },
  { key: 'team',        label: 'Team',    sortKey: null,             width: '60px' },
  { key: 'position',    label: 'POS',     sortKey: null,             width: '50px' },
  { key: 'gp',          label: 'GP',      sortKey: 'games_played',   width: '50px' },
  { key: 'goals',       label: 'G',       sortKey: 'goals',          width: '45px' },
  { key: 'assists',     label: 'A',       sortKey: 'assists',        width: '45px' },
  { key: 'points',      label: 'PTS',     sortKey: 'points',         width: '50px' },
  { key: 'plus_minus',  label: '+/-',     sortKey: 'plus_minus',     width: '50px' },
  { key: 'shots',       label: 'SOG',     sortKey: 'shots',          width: '50px' },
  { key: 'pim',         label: 'PIM',     sortKey: 'pim',            width: '50px' },
  { key: 'fantasy',     label: 'FP',      sortKey: 'fantasy_value',  width: '60px' },
];

const GOALIE_COLS = [
  { key: 'name',        label: 'Player',  sortKey: 'name',          width: '180px', sticky: true },
  { key: 'team',        label: 'Team',    sortKey: null,             width: '60px' },
  { key: 'position',    label: 'POS',     sortKey: null,             width: '50px' },
  { key: 'gp',          label: 'GP',      sortKey: 'games_played',   width: '50px' },
  { key: 'wins',        label: 'W',       sortKey: 'wins',           width: '45px' },
  { key: 'losses',      label: 'L',       sortKey: 'losses',         width: '45px' },
  { key: 'save_pct',    label: 'SV%',     sortKey: 'save_pct',       width: '65px' },
  { key: 'gaa',         label: 'GAA',     sortKey: 'gaa',            width: '60px' },
  { key: 'shutouts',    label: 'SO',      sortKey: 'shutouts',       width: '50px' },
  { key: 'fantasy',     label: 'FP',      sortKey: 'fantasy_value',  width: '60px' },
];

const POSITIONS = ['All', 'C', 'LW', 'RW', 'D', 'G'];
const SEASONS = ['2025-2026', '2024-2025', '2024'];

const PlayersTable = () => {
  const [playerType, setPlayerType] = useState('skaters'); // 'skaters' | 'goalies'
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('All');
  const [selectedPosition, setSelectedPosition] = useState('All');
  const [selectedSeason, setSelectedSeason] = useState('2025-2026');
  const [sortBy, setSortBy] = useState('fantasy_value');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    pwhlPlayersAPI.getAllTeams()
      .then(r => setTeams(r.data || []))
      .catch(() => {});
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

  return (
    <div>
      {/* Controls */}
      <div style={styles.controls}>
        {/* Player type toggle */}
        <div style={styles.typeToggle}>
          {['skaters', 'goalies'].map(t => (
            <button
              key={t}
              style={{ ...styles.toggleBtn, ...(playerType === t ? styles.toggleBtnActive : {}) }}
              onClick={() => { setPlayerType(t); setSelectedPosition('All'); }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Season selector */}
        <select
          value={selectedSeason}
          onChange={e => setSelectedSeason(e.target.value)}
          style={styles.select}
        >
          {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Search */}
      <div style={styles.searchRow}>
        <div style={styles.searchWrapper}>
          <i className="fas fa-search" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          {search && (
            <button onClick={() => setSearch('')} style={styles.clearBtn}>
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
          <div style={{ minWidth: cols.reduce((sum, c) => sum + parseInt(c.width), 0) + 'px' }}>
            {/* Header */}
            <div style={styles.tableHeader}>
              {cols.map(col => (
                <div
                  key={col.key}
                  style={{
                    ...styles.th,
                    width: col.width,
                    minWidth: col.width,
                    cursor: col.sortKey ? 'pointer' : 'default',
                    color: sortBy === col.sortKey ? 'var(--pink)' : 'rgba(255,255,255,0.80)',
                    textAlign: col.key === 'name' ? 'left' : 'center',
                  }}
                  onClick={() => handleSort(col.sortKey)}
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
              <div style={styles.loadingRow}>Loading players...</div>
            ) : players.length === 0 ? (
              <div style={styles.loadingRow}>No players found</div>
            ) : (
              players.map((player, idx) => (
                <PlayerRow key={player.id} player={player} cols={cols} getCellValue={getCellValue} idx={idx} />
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

const PlayerRow = ({ player, cols, getCellValue, idx }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        ...styles.tableRow,
        background: hovered ? 'rgba(255,255,255,0.05)' : (idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {cols.map(col => (
        <div
          key={col.key}
          style={{
            ...styles.td,
            width: col.width,
            minWidth: col.width,
            textAlign: col.key === 'name' ? 'left' : 'center',
            color: col.key === 'fantasy' ? 'var(--pink)' : col.key === 'name' ? '#fff' : 'rgba(255,255,255,0.92)',
            fontWeight: col.key === 'fantasy' ? '700' : col.key === 'name' ? '600' : '400',
          }}
        >
          {col.key === 'name' && player.headshot_url ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src={player.headshot_url}
                alt=""
                style={styles.headshot}
                onError={e => { e.target.style.display = 'none'; }}
              />
              <span>{getCellValue(player, 'name')}</span>
            </div>
          ) : (
            getCellValue(player, col.key)
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
