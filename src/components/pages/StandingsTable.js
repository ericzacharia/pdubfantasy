import React, { useState, useEffect } from 'react';
import { pwhlLeagueAPI } from '../../services/pwhlAPI';

const COLS = [
  { key: 'rank',  label: '#',   width: '36px' },
  { key: 'team',  label: 'Team', width: '200px' },
  { key: 'gp',    label: 'GP',  width: '50px' },
  { key: 'w',     label: 'W',   width: '45px' },
  { key: 'otw',   label: 'OTW', width: '50px' },
  { key: 'l',     label: 'L',   width: '45px' },
  { key: 'otl',   label: 'OTL', width: '50px' },
  { key: 'pts',   label: 'PTS', width: '55px' },
  { key: 'gf',    label: 'GF',  width: '50px' },
  { key: 'ga',    label: 'GA',  width: '50px' },
];

const StandingsTable = () => {
  const [standings, setStandings] = useState([]);
  const [season, setSeason] = useState('2025-2026');
  const [seasons, setSeasons] = useState(['2025-2026', '2024-2025', '2024']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pwhlLeagueAPI.getStandingSeasons()
      .then(r => { if (r.data?.length) setSeasons(r.data.map(s => s.value || s)); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    pwhlLeagueAPI.getStandings({ season })
      .then(r => setStandings(r.data || []))
      .catch(() => setStandings([]))
      .finally(() => setLoading(false));
  }, [season]);

  const getCellValue = (team, key, rank) => {
    switch (key) {
      case 'rank': return rank + 1;
      case 'team': return null; // rendered specially
      case 'gp':   return team.gp ?? 0;
      case 'w':    return team.w ?? 0;
      case 'otw':  return team.otw ?? 0;
      case 'l':    return team.l ?? 0;
      case 'otl':  return team.otl ?? 0;
      case 'pts':  return team.pts ?? 0;
      case 'gf':   return team.gf ?? 0;
      case 'ga':   return team.ga ?? 0;
      default:     return '—';
    }
  };

  return (
    <div>
      <div style={styles.controls}>
        <select
          value={season}
          onChange={e => setSeason(e.target.value)}
          style={styles.select}
        >
          {seasons.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={styles.tableCard}>
        <div className="pwhl-table-scroll">
          <div style={{ minWidth: '590px' }}>
            {/* Header */}
            <div style={styles.tableHeader}>
              {COLS.map(col => (
                <div
                  key={col.key}
                  style={{
                    ...styles.th,
                    width: col.width,
                    minWidth: col.width,
                    textAlign: col.key === 'team' ? 'left' : 'center',
                    color: col.key === 'pts' ? 'var(--pink)' : 'rgba(255,255,255,0.80)',
                  }}
                >
                  {col.label}
                </div>
              ))}
            </div>

            {loading ? (
              <div style={styles.loadingRow}>Loading standings...</div>
            ) : standings.length === 0 ? (
              <div style={styles.loadingRow}>No standings available</div>
            ) : (
              standings.map((team, idx) => (
                <StandingRow
                  key={team.id || idx}
                  team={team}
                  rank={idx}
                  cols={COLS}
                  getCellValue={getCellValue}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StandingRow = ({ team, rank, cols, getCellValue }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        ...styles.tableRow,
        background: hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
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
            textAlign: col.key === 'team' ? 'left' : 'center',
            fontWeight: col.key === 'pts' ? '700' : '400',
            color: col.key === 'pts' ? 'var(--pink)' : col.key === 'rank' ? 'rgba(255,255,255,0.65)' : '#fff',
          }}
        >
          {col.key === 'team' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {team.logo_url && (
                <img
                  src={team.logo_url}
                  alt=""
                  style={styles.logo}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{team.city} {team.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}>{team.abbreviation}</div>
              </div>
            </div>
          ) : (
            getCellValue(team, col.key, rank)
          )}
        </div>
      ))}
    </div>
  );
};

const styles = {
  controls: {
    marginBottom: '1rem',
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
  },
  tableRow: {
    display: 'flex',
    padding: '10px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    alignItems: 'center',
    transition: 'background 0.15s ease',
  },
  td: {
    fontSize: '0.875rem',
    padding: '0 4px',
  },
  logo: {
    width: '32px',
    height: '32px',
    objectFit: 'contain',
    flexShrink: 0,
  },
  loadingRow: {
    padding: '2rem',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.65)',
    fontSize: '0.9rem',
  },
};

export default StandingsTable;
