/**
 * Shared player stats table — used on Hub (/hub), Team pages (/team/:abbr),
 * and any other page showing a sortable list of player stats.
 *
 * Props:
 *   players       – array of player objects with season_stats, headshot_url, etc.
 *   cols          – column definitions: { key, label, sortKey, flex, width, highlight }
 *   sortKey       – active sort column key
 *   sortDir       – 'asc' | 'desc'
 *   onSort        – fn(sortKey) called when a header is clicked
 *   teamLogoMap   – { [abbreviation]: logo_url }  (optional)
 *   startRank     – integer offset for rank column (default 1)
 *   isWatched     – fn(playerId) → bool  (optional)
 *   onToggleWatch – fn(e, playerId)       (optional)
 *   onPlayerClick – fn(player)            navigate to player detail
 *   loading       – bool
 *   emptyMessage  – string shown when no players
 *   perGame       – bool: show per-game averages
 */
import React, { useState } from 'react';
import PlayerAvatar from './PlayerAvatar';
import PosBadge from './PosBadge';

const PlayerStatsTable = ({
  players = [],
  cols = [],
  sortKey,
  sortDir = 'desc',
  onSort,
  teamLogoMap = {},
  startRank = 1,
  isWatched,
  onToggleWatch,
  onPlayerClick,
  loading = false,
  emptyMessage = 'No players found',
  perGame = false,
}) => {
  if (loading) {
    return (
      <div style={s.tableCard}>
        <div style={s.empty}>
          <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }} />
          Loading players…
        </div>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="pwhl-empty">
        <div className="icon"><i className="fas fa-search" /></div>
        <div className="label">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div style={s.tableCard}>
      <div className="pwhl-table-scroll">
        <div style={{ minWidth: '480px' }}>
          {/* Header */}
          <div style={s.tableHeader}>
            {cols.map((col, i) => {
              const sortable = !!col.sortKey;
              const isActive = sortKey === col.sortKey;
              return (
                <div
                  key={col.key}
                  style={{
                    ...s.th,
                    ...(col.flex ? { flex: 1, minWidth: col.minWidth || '44px' } : { width: col.width, minWidth: col.width }),
                    textAlign: i === 0 ? 'left' : 'center',
                    color: isActive || col.highlight ? 'var(--pink)' : 'rgba(255,255,255,0.7)',
                    cursor: sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                  onClick={() => sortable && onSort && onSort(col.sortKey)}
                  aria-sort={isActive ? (sortDir === 'desc' ? 'descending' : 'ascending') : undefined}
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

          {/* Rows */}
          {players.map((player, idx) => (
            <PlayerRow
              key={player.id || idx}
              player={player}
              cols={cols}
              idx={idx}
              rank={startRank + idx}
              teamLogoMap={teamLogoMap}
              isWatched={isWatched?.(player.id)}
              onToggleWatch={onToggleWatch ? (e) => onToggleWatch(e, player.id) : null}
              onPlayerClick={() => onPlayerClick?.(player)}
              perGame={perGame}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const PlayerRow = ({ player, cols, idx, rank, teamLogoMap, isWatched, onToggleWatch, onPlayerClick, perGame }) => {
  const [hovered, setHovered] = useState(false);
  const stats = player.season_stats || {};
  const gp = stats.games_played || 1;

  const getVal = (key) => {
    switch (key) {
      case 'rank':       return null; // rendered specially
      case 'jersey':     return player.jersey_number ?? '—';
      case 'position':   return player.position;
      case 'gp':         return stats.games_played ?? 0;
      case 'goals':      { const v = stats.goals ?? 0; return perGame ? (gp > 0 ? (v/gp).toFixed(2) : '—') : v; }
      case 'assists':    { const v = stats.assists ?? 0; return perGame ? (gp > 0 ? (v/gp).toFixed(2) : '—') : v; }
      case 'points':     { const v = (stats.goals ?? 0) + (stats.assists ?? 0); return perGame ? (gp > 0 ? (v/gp).toFixed(2) : '—') : v; }
      case 'plus_minus': return stats.plus_minus ?? 0;
      case 'shots':      return stats.shots ?? 0;
      case 'ppg':        return stats.pp_goals ?? 0;
      case 'ptspg':      { const p = stats.points ?? 0; return gp > 0 ? (p/gp).toFixed(2) : '—'; }
      case 'blocks':     return stats.blocks ?? 0;
      case 'pim':        return stats.penalty_minutes ?? 0;
      case 'wins':       return stats.wins ?? 0;
      case 'losses':     return stats.losses ?? 0;
      case 'saves':      return stats.saves ?? 0;
      case 'save_pct':   return stats.save_percentage != null ? Number(stats.save_percentage).toFixed(3) : '—';
      case 'gaa':        return stats.goals_against_average != null ? Number(stats.goals_against_average).toFixed(2) : '—';
      case 'shutouts':   return stats.shutouts ?? 0;
      case 'fantasy':    return (player.fantasy_value ?? 0).toFixed(1);
      default:           return '—';
    }
  };

  return (
    <div
      style={{
        ...s.tableRow,
        background: hovered ? 'rgba(255,255,255,0.06)' : (idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)'),
        cursor: onPlayerClick ? 'pointer' : 'default',
      }}
      onClick={onPlayerClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {cols.map((col, i) => (
        <div
          key={col.key}
          style={{
            ...s.td,
            ...(col.flex ? { flex: 1, minWidth: col.minWidth || '44px' } : { width: col.width, minWidth: col.width }),
            textAlign: i === 0 ? 'left' : 'center',
            color: col.highlight || col.key === 'fantasy' ? 'var(--pink)' : i === 0 ? '#fff' : 'rgba(255,255,255,0.88)',
            fontWeight: col.highlight || col.key === 'fantasy' ? '700' : i === 0 ? '600' : '400',
          }}
        >
          {col.key === 'rank' ? (
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>{rank}</span>

          ) : col.key === 'name' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <PlayerAvatar src={player.headshot_url} name={`${player.first_name} ${player.last_name}`} position={player.position} size={28} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ color: hovered ? 'var(--pink)' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.15s', fontSize: '0.875rem' }}>
                  {player.first_name} {player.last_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                  {teamLogoMap[player.team_abbreviation] && (
                    <img src={teamLogoMap[player.team_abbreviation]} alt={player.team_abbreviation}
                      style={{ width: '13px', height: '13px', objectFit: 'contain', opacity: 0.8 }}
                      onError={e => { e.target.style.display = 'none'; }} />
                  )}
                  <PosBadge pos={player.position} />
                  {player.jersey_number && (
                    <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>#{player.jersey_number}</span>
                  )}
                </div>
              </div>
              {onToggleWatch && (
                <button
                  className={`pwhl-star ${isWatched ? 'active' : ''}`}
                  onClick={e => { e.stopPropagation(); onToggleWatch(e); }}
                  aria-label={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
                >
                  <i className={isWatched ? 'fas fa-star' : 'far fa-star'} />
                </button>
              )}
              {hovered && <i className="fas fa-chevron-right" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />}
            </div>

          ) : col.key === 'position' ? (
            <PosBadge pos={player.position} size="sm" />

          ) : (
            getVal(col.key)
          )}
        </div>
      ))}
    </div>
  );
};

const s = {
  tableCard:   { background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' },
  tableHeader: { display: 'flex', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' },
  th:          { fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '0 4px', transition: 'color 0.15s' },
  tableRow:    { display: 'flex', padding: '9px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', transition: 'background 0.12s' },
  td:          { fontSize: '0.875rem', padding: '0 4px' },
  empty:       { padding: '2.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' },
};

export default PlayerStatsTable;
