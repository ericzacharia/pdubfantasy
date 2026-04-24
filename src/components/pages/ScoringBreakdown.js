import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePwhlAuth } from '../../contexts/PwhlAuthContext';
import { pwhlFantasyAPI } from '../../services/pwhlAPI';
import PlayerAvatar from '../PlayerAvatar';

const ScoringBreakdown = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { isPwhlAuthenticated } = usePwhlAuth();
  const [data, setData] = useState(null);
  const [week, setWeek] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPwhlAuthenticated) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await pwhlFantasyAPI.getWeeklyScoring(teamId, week);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [teamId, week, isPwhlAuthenticated]);

  const goWeek = (delta) => {
    const current = data?.week || 1;
    const next = Math.max(1, current + delta);
    setWeek(next);
  };

  if (!isPwhlAuthenticated) return <div style={styles.center}>Sign in to view scoring.</div>;
  if (loading) return <div style={styles.center}>Loading scoring...</div>;

  const activePlayers = data?.players?.filter(p => !p.is_bench) || [];
  const benchPlayers = data?.players?.filter(p => p.is_bench) || [];

  // Collect all dates in this week that have data
  const allDates = [...new Set(data?.players?.flatMap(p => Object.keys(p.days || {})) || [])].sort();

  return (
    <div>
      <button style={styles.backBtn} onClick={() => navigate(-1)}>
        <i className="fas fa-chevron-left" style={{ marginRight: '6px' }} />Back
      </button>

      <div style={styles.header}>
        <h2 style={styles.title}>Scoring Breakdown</h2>
        <div style={styles.weekNav}>
          <button style={styles.navBtn} onClick={() => goWeek(-1)}>
            <i className="fas fa-chevron-left" />
          </button>
          <span style={styles.weekLabel}>Week {data?.week || '—'}</span>
          <button style={styles.navBtn} onClick={() => goWeek(1)}>
            <i className="fas fa-chevron-right" />
          </button>
        </div>
      </div>

      {data?.week_start && (
        <div style={styles.dateRange}>
          {new Date(data.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
          {new Date(data.week_end + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      )}

      {/* Total */}
      <div style={styles.totalCard}>
        <div style={styles.totalPoints}>{(data?.total_points || 0).toFixed(2)}</div>
        <div style={styles.totalLabel}>Total Fantasy Points (Active Roster)</div>
      </div>

      {/* Active players table */}
      {activePlayers.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Active Lineup</h3>
          <div style={styles.tableCard}>
            <div className="pwhl-table-scroll">
              <div style={{ minWidth: allDates.length > 0 ? `${320 + allDates.length * 70}px` : '320px' }}>
                <div style={styles.tableHeader}>
                  <div style={{ ...styles.th, width: '180px', textAlign: 'left' }}>Player</div>
                  <div style={{ ...styles.th, width: '50px', textAlign: 'center' }}>Slot</div>
                  {allDates.map(d => (
                    <div key={d} style={{ ...styles.th, width: '65px', textAlign: 'center' }}>
                      {new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                    </div>
                  ))}
                  <div style={{ ...styles.th, width: '65px', textAlign: 'center', color: 'var(--pink)' }}>Total</div>
                </div>
                {activePlayers.map((player, i) => (
                  <div
                    key={player.player_id}
                    style={{ ...styles.tableRow, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.04)', cursor: 'pointer' }}
                    onClick={() => navigate(`/player/${player.player_id}`)}
                  >
                    <div style={{ ...styles.td, width: '180px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <PlayerAvatar src={player.headshot_url} name={player.player_name} position={player.position} size={26} />
                      <span style={{ color: '#fff', fontWeight: '500', fontSize: '0.875rem' }}>{player.player_name}</span>
                    </div>
                    <div style={{ ...styles.td, width: '50px', textAlign: 'center' }}>
                      <span style={styles.slotBadge}>{player.slot_type}</span>
                    </div>
                    {allDates.map(d => {
                      const pts = player.days?.[d] || 0;
                      return (
                        <div key={d} style={{ ...styles.td, width: '65px', textAlign: 'center', color: pts > 0 ? '#fff' : 'rgba(255,255,255,0.25)', fontWeight: pts > 0 ? '500' : '400' }}>
                          {pts > 0 ? pts.toFixed(1) : '—'}
                        </div>
                      );
                    })}
                    <div style={{ ...styles.td, width: '65px', textAlign: 'center', color: 'var(--pink)', fontWeight: '700' }}>
                      {player.total_points.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bench */}
      {benchPlayers.length > 0 && (
        <div style={styles.section}>
          <h3 style={{ ...styles.sectionTitle, color: 'rgba(255,255,255,0.5)' }}>
            Bench <span style={{ fontSize: '0.78rem', fontWeight: '400' }}>(not counted)</span>
          </h3>
          <div style={styles.tableCard}>
            <div className="pwhl-table-scroll">
              <div style={{ minWidth: '320px' }}>
                {benchPlayers.map((player, i) => (
                  <div
                    key={player.player_id}
                    style={{ ...styles.tableRow, background: 'transparent', opacity: 0.6, cursor: 'pointer' }}
                    onClick={() => navigate(`/player/${player.player_id}`)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <PlayerAvatar src={player.headshot_url} name={player.player_name} position={player.position} size={24} />
                      <span style={{ color: '#fff', fontSize: '0.875rem' }}>{player.player_name}</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>{player.position}</span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>{player.total_points.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {(!data?.players || data.players.length === 0) && (
        <div style={styles.empty}>No scoring data for this week yet. Scoring updates after each game day.</div>
      )}
    </div>
  );
};

const styles = {
  center: { textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' },
  backBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.875rem', padding: '0 0 0.75rem', display: 'flex', alignItems: 'center' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  title: { fontSize: '1.4rem', fontWeight: '700', color: '#fff', margin: 0 },
  weekNav: { display: 'flex', alignItems: 'center', gap: '10px' },
  navBtn: { background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  weekLabel: { fontSize: '0.9rem', fontWeight: '600', color: '#fff', minWidth: '60px', textAlign: 'center' },
  dateRange: { fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', marginBottom: '1.25rem' },
  totalCard: { background: 'rgba(255,124,222,0.08)', border: '1px solid rgba(255,124,222,0.2)', borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '1.5rem' },
  totalPoints: { fontSize: '3rem', fontWeight: '800', color: 'var(--pink)', lineHeight: 1 },
  totalLabel: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '6px' },
  section: { marginBottom: '1.5rem' },
  sectionTitle: { fontSize: '1rem', fontWeight: '600', color: '#fff', marginBottom: '10px' },
  tableCard: { background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' },
  tableHeader: { display: 'flex', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' },
  th: { fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', padding: '0 4px' },
  tableRow: { display: 'flex', padding: '9px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', transition: 'background 0.15s' },
  td: { fontSize: '0.875rem', padding: '0 4px', color: 'rgba(255,255,255,0.85)' },
  slotBadge: { fontSize: '0.7rem', fontWeight: '700', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px' },
  empty: { textAlign: 'center', padding: '2.5rem', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)' },
};

export default ScoringBreakdown;
