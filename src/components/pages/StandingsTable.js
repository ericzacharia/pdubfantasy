import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PlayerAvatar from '../PlayerAvatar';
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
  const navigate = useNavigate();
  const [standings, setStandings] = useState([]);
  const [season, setSeason] = useState('2025-2026');
  const [seasons, setSeasons] = useState(['2025-2026', '2024-2025', '2024']);
  const [loading, setLoading] = useState(true);
  const [rosterTeam, setRosterTeam] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);

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

  const openRoster = async (team) => {
    setRosterTeam(team);
    setRosterLoading(true);
    try {
      const res = await pwhlLeagueAPI.getTeamRoster(team.id);
      setRoster(res.data || []);
    } catch { setRoster([]); }
    finally { setRosterLoading(false); }
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

      {/* Team Roster Modal */}
      {rosterTeam && (
        <div style={modalStyles.overlay} onClick={() => setRosterTeam(null)}>
          <div style={modalStyles.card} onClick={e => e.stopPropagation()}>
            <div style={modalStyles.header}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {rosterTeam.logo_url && <img src={rosterTeam.logo_url} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />}
                <h3 style={{ margin: 0, color: '#fff' }}>{rosterTeam.city} {rosterTeam.name}</h3>
              </div>
              <button onClick={() => setRosterTeam(null)} style={modalStyles.closeBtn}><i className="fas fa-times" /></button>
            </div>
            {rosterLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading...</div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {roster.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }} onClick={() => { navigate(`/player/${p.slug || p.id}`); setRosterTeam(null); }}>
                    <PlayerAvatar src={p.headshot_url} name={`${p.first_name} ${p.last_name}`} position={p.position} size={32} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontWeight: '500', fontSize: '0.9rem' }}>{p.first_name} {p.last_name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>#{p.jersey_number} · {p.position}</div>
                    </div>
                    <div style={{ color: 'var(--pink)', fontWeight: '700', fontSize: '0.9rem' }}>{(p.fantasy_value || 0).toFixed(1)} FP</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Points legend */}
      <div style={styles.legend}>
        {[
          { key: 'W',   label: 'Regulation Win',   pts: 3,  color: '#00c853' },
          { key: 'OTW', label: 'Overtime/SO Win',  pts: 2,  color: '#69db7c' },
          { key: 'OTL', label: 'Overtime/SO Loss',  pts: 1,  color: '#ffc107' },
          { key: 'L',   label: 'Regulation Loss',   pts: 0,  color: '#ff5252' },
        ].map(({ key, label, pts, color }) => (
          <div key={key} style={styles.legendItem} title={label}>
            <span style={{ ...styles.legendKey, color }}>{key}</span>
            <span style={styles.legendPts}>{pts} pt{pts !== 1 ? 's' : ''}</span>
          </div>
        ))}
        <span style={styles.legendNote}>· PTS = total standings points</span>
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
                  idx={idx}
                  cols={COLS}
                  getCellValue={getCellValue}
                  onRosterClick={() => navigate(`/team/${team.abbreviation}`)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StandingRow = ({ team, rank, cols, getCellValue, onRosterClick, idx }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        ...styles.tableRow,
        background: hovered ? 'rgba(255,255,255,0.07)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)',
        cursor: 'pointer',
      }}
      onClick={onRosterClick}
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
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '8px 4px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.78rem',
  },
  legendKey: {
    fontWeight: '700',
    minWidth: '28px',
  },
  legendPts: {
    color: 'rgba(255,255,255,0.4)',
  },
  legendNote: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.3)',
    marginLeft: 'auto',
  },
};

const modalStyles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  card: { background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  closeBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1rem' },
};

export default StandingsTable;
