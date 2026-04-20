import React, { useState, useEffect } from 'react';
import { pwhlFantasyAPI } from '../../services/pwhlAPI';

const LeagueStandings = ({ leagueId, navigate }) => {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leagueId) return;
    pwhlFantasyAPI.getLeagueStandings(leagueId)
      .then(r => setStandings(r.data || []))
      .catch(() => setStandings([]))
      .finally(() => setLoading(false));
  }, [leagueId]);

  if (loading) return <div style={styles.loading}>Loading standings...</div>;
  if (standings.length === 0) return <div style={styles.loading}>No standings available yet.</div>;

  return (
    <div style={styles.tableCard}>
      <div className="pwhl-table-scroll">
        <div style={{ minWidth: '500px' }}>
          {/* Header */}
          <div style={styles.header}>
            {['#', 'Team', 'Owner', 'W', 'L', 'T', 'PTS', 'Waiver'].map((col, i) => (
              <div key={i} style={{ ...styles.th, width: COL_WIDTHS[i], minWidth: COL_WIDTHS[i], textAlign: i <= 1 ? 'left' : 'center', color: col === 'PTS' ? 'var(--pink)' : 'rgba(255,255,255,0.80)' }}>
                {col}
              </div>
            ))}
          </div>

          {standings.map((team, idx) => (
            <StandingRow key={team.team_id || idx} team={team} rank={idx + 1} navigate={navigate} />
          ))}
        </div>
      </div>
    </div>
  );
};

const COL_WIDTHS = ['36px', '160px', '130px', '45px', '45px', '45px', '65px', '65px'];

const StandingRow = ({ team, rank, navigate }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ ...styles.row, background: hovered ? 'rgba(255,255,255,0.05)' : 'transparent', cursor: navigate ? 'pointer' : 'default' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate && team.team_id && navigate(`/pwhl/teams/${team.team_id}`)}
    >
      <div style={{ ...styles.td, width: COL_WIDTHS[0], minWidth: COL_WIDTHS[0], color: 'rgba(255,255,255,0.65)' }}>{rank}</div>
      <div style={{ ...styles.td, width: COL_WIDTHS[1], minWidth: COL_WIDTHS[1], fontWeight: '600', color: '#fff' }}>{team.team_name}</div>
      <div style={{ ...styles.td, width: COL_WIDTHS[2], minWidth: COL_WIDTHS[2], color: 'rgba(255,255,255,0.80)' }}>{team.owner_username}</div>
      <div style={{ ...styles.td, width: COL_WIDTHS[3], minWidth: COL_WIDTHS[3], textAlign: 'center' }}>{team.wins}</div>
      <div style={{ ...styles.td, width: COL_WIDTHS[4], minWidth: COL_WIDTHS[4], textAlign: 'center' }}>{team.losses}</div>
      <div style={{ ...styles.td, width: COL_WIDTHS[5], minWidth: COL_WIDTHS[5], textAlign: 'center' }}>{team.ties}</div>
      <div style={{ ...styles.td, width: COL_WIDTHS[6], minWidth: COL_WIDTHS[6], textAlign: 'center', fontWeight: '700', color: 'var(--pink)' }}>
        {(team.total_points || 0).toFixed(1)}
      </div>
      <div style={{ ...styles.td, width: COL_WIDTHS[7], minWidth: COL_WIDTHS[7], textAlign: 'center', color: 'rgba(255,255,255,0.80)' }}>
        #{team.rank || '—'}
      </div>
    </div>
  );
};

const styles = {
  loading: { textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.65)' },
  tableCard: { background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' },
  header: { display: 'flex', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' },
  th: { fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '0 4px' },
  row: { display: 'flex', padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', transition: 'background 0.15s' },
  td: { fontSize: '0.875rem', padding: '0 4px', color: 'rgba(255,255,255,0.92)' },
};

export default LeagueStandings;
