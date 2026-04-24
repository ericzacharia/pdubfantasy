import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePwhlAuth } from '../../contexts/PwhlAuthContext';
import { pwhlFantasyAPI } from '../../services/pwhlAPI';

const MatchupView = () => {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { isPwhlAuthenticated } = usePwhlAuth();
  const [currentMatchup, setCurrentMatchup] = useState(null);
  const [allMatchups, setAllMatchups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current');

  useEffect(() => {
    if (!isPwhlAuthenticated) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [currentRes, allRes] = await Promise.all([
          pwhlFantasyAPI.getCurrentMatchup(leagueId).catch(() => ({ data: null })),
          pwhlFantasyAPI.getAllMatchups(leagueId).catch(() => ({ data: [] })),
        ]);
        setCurrentMatchup(currentRes.data);
        setAllMatchups(allRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [leagueId, isPwhlAuthenticated]);

  if (!isPwhlAuthenticated) return <div style={styles.center}>Sign in to view matchups.</div>;
  if (loading) return <div style={styles.center}>Loading matchups...</div>;

  const regularSeason = allMatchups.filter(m => !m.is_playoff);
  const playoffs = allMatchups.filter(m => m.is_playoff);

  return (
    <div>
      <button style={styles.backBtn} onClick={() => navigate(`/leagues/${leagueId}`)}>
        <i className="fas fa-chevron-left" style={{ marginRight: '6px' }} />League
      </button>

      <h2 style={styles.title}>
        <i className="fas fa-hockey-puck" style={{ marginRight: '10px', color: 'var(--pink)' }} />
        Matchups
      </h2>

      <div style={styles.tabs}>
        {[['current', 'This Week'], ['schedule', 'Full Schedule'], ['playoffs', `Playoffs (${playoffs.length})`]].map(([id, label]) => (
          <button
            key={id}
            style={{ ...styles.tab, ...(activeTab === id ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(id)}
          >{label}</button>
        ))}
      </div>

      {activeTab === 'current' && (
        <div>
          {!currentMatchup?.matchup ? (
            <div style={styles.empty}>No matchup scheduled this week.</div>
          ) : (
            <CurrentMatchupCard matchup={currentMatchup.matchup || currentMatchup} week={currentMatchup.week} />
          )}
          {/* Also show all week's matchups */}
          <div style={{ marginTop: '2rem' }}>
            <h3 style={styles.sectionTitle}>All Week {currentMatchup?.week || '—'} Matchups</h3>
            {allMatchups
              .filter(m => m.week === (currentMatchup?.week))
              .map((m, i) => <MatchupCard key={i} matchup={m} />)}
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div>
          {regularSeason.length === 0 ? (
            <div style={styles.empty}>Schedule not yet generated. Complete the draft to generate the schedule.</div>
          ) : (
            <ScheduleTable matchups={regularSeason} />
          )}
        </div>
      )}

      {activeTab === 'playoffs' && (
        <div>
          {playoffs.length === 0 ? (
            <div style={styles.empty}>Playoffs not yet scheduled.</div>
          ) : (
            <ScheduleTable matchups={playoffs} />
          )}
        </div>
      )}
    </div>
  );
};

const CurrentMatchupCard = ({ matchup, week }) => {
  if (!matchup) return null;
  const isActive = matchup.status === 'active';
  const isCompleted = matchup.status === 'completed';

  return (
    <div style={styles.currentCard}>
      <div style={styles.currentHeader}>
        <span style={styles.weekLabel}>Week {matchup.week || week}</span>
        {matchup.week_start && (
          <span style={styles.dateRange}>
            {new Date(matchup.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
            {new Date(matchup.week_end + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        <span style={{
          ...styles.statusPill,
          background: isActive ? 'rgba(0,200,83,0.15)' : isCompleted ? 'rgba(255,255,255,0.08)' : 'rgba(255,193,7,0.15)',
          color: isActive ? '#00c853' : isCompleted ? 'rgba(255,255,255,0.5)' : '#ffc107',
        }}>
          {isActive ? 'LIVE' : isCompleted ? 'FINAL' : 'UPCOMING'}
        </span>
      </div>

      <div style={styles.vsRow}>
        <TeamScore
          team={matchup.my_team_side === 'a' ? matchup.team_a : matchup.team_b}
          points={matchup.my_points}
          isWinner={isCompleted && matchup.winner_id === (matchup.my_team_side === 'a' ? matchup.team_a?.id : matchup.team_b?.id)}
          beatMedian={matchup.my_beat_median}
          isMe
        />
        <div style={styles.vsLabel}>VS</div>
        <TeamScore
          team={matchup.my_team_side === 'a' ? matchup.team_b : matchup.team_a}
          points={matchup.opp_points}
          isWinner={isCompleted && matchup.winner_id !== (matchup.my_team_side === 'a' ? matchup.team_a?.id : matchup.team_b?.id)}
          beatMedian={matchup.opp_beat_median}
        />
      </div>
      {matchup.league_median_score != null && isCompleted && (
        <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '12px' }}>
          <i className="fas fa-chart-bar" style={{ marginRight: '6px' }} />
          League median: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{matchup.league_median_score.toFixed(1)} pts</strong>
          <span style={{ marginLeft: '6px', fontSize: '0.72rem' }}>— scoring above median counts as an extra win</span>
        </div>
      )}
    </div>
  );
};

const TeamScore = ({ team, points, isWinner, isMe, beatMedian }) => (
  <div style={{ ...styles.teamScore, opacity: isMe ? 1 : 0.85 }}>
    <div style={{ ...styles.teamScoreName, color: isWinner ? 'var(--pink)' : '#fff', fontWeight: isMe ? '700' : '500' }}>
      {team?.name || '—'}
      {isMe && <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginLeft: '6px' }}>(You)</span>}
    </div>
    <div style={{ ...styles.teamScorePoints, color: isWinner ? 'var(--pink)' : '#fff' }}>
      {(points || 0).toFixed(2)}
    </div>
    <div style={styles.teamScoreLabel}>pts</div>
    {isWinner && <div style={styles.winnerBadge}>WIN</div>}
    {beatMedian != null && (
      <div style={{ fontSize: '0.72rem', marginTop: '6px', color: beatMedian ? '#00c853' : '#ef4444', fontWeight: '600' }}>
        {beatMedian ? '↑ Beat median' : '↓ Below median'}
      </div>
    )}
  </div>
);

const MatchupCard = ({ matchup }) => {
  const aWon = matchup.winner_id && matchup.winner_id === matchup.team_a?.id;
  const bWon = matchup.winner_id && matchup.winner_id === matchup.team_b?.id;
  const hasScores = (matchup.team_a_points || 0) + (matchup.team_b_points || 0) > 0;
  const hasMedian = matchup.league_median_score != null;

  return (
    <div style={styles.matchupRow}>
      <span style={{ color: aWon ? 'var(--pink)' : '#fff', flex: 1, fontWeight: aWon ? '700' : '400' }}>
        {matchup.team_a?.name || 'TBD'}
        {matchup.is_my_matchup && matchup.my_team_side === 'a' && (
          <span style={styles.myMatchupTag}>You</span>
        )}
      </span>
      <div style={{ textAlign: 'center', minWidth: '110px' }}>
        <div style={styles.matchupScore}>
          {hasScores
            ? `${(matchup.team_a_points || 0).toFixed(1)} – ${(matchup.team_b_points || 0).toFixed(1)}`
            : '— vs —'
          }
        </div>
        {hasMedian && hasScores && (
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
            median {matchup.league_median_score.toFixed(1)}
            {' '}·{' '}
            <span style={{ color: matchup.team_a_beat_median ? '#00c853' : '#ef4444' }}>
              {matchup.team_a_beat_median ? '↑' : '↓'}
            </span>
            <span style={{ color: matchup.team_b_beat_median ? '#00c853' : '#ef4444' }}>
              {matchup.team_b_beat_median ? '↑' : '↓'}
            </span>
          </div>
        )}
      </div>
      <span style={{ color: bWon ? 'var(--pink)' : '#fff', flex: 1, textAlign: 'right', fontWeight: bWon ? '700' : '400' }}>
        {matchup.team_b?.name || 'BYE'}
        {matchup.is_my_matchup && matchup.my_team_side === 'b' && (
          <span style={styles.myMatchupTag}>You</span>
        )}
      </span>
    </div>
  );
};

const ScheduleTable = ({ matchups }) => {
  const byWeek = matchups.reduce((acc, m) => {
    const w = m.week;
    if (!acc[w]) acc[w] = [];
    acc[w].push(m);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {Object.entries(byWeek).map(([week, weekMatchups]) => {
        const m = weekMatchups[0];
        const statusColor = m.status === 'completed' ? 'rgba(255,255,255,0.35)' : m.status === 'active' ? '#00c853' : '#ffc107';
        return (
          <div key={week} style={styles.weekBlock}>
            <div style={styles.weekBlockHeader}>
              <span style={{ fontWeight: '700', color: '#fff' }}>
                Week {week}{m.is_playoff ? ` — ${m.playoff_round}` : ''}
              </span>
              {m.week_start && (
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
                  {new Date(m.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                  {new Date(m.week_end + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
              <span style={{ fontSize: '0.72rem', color: statusColor, fontWeight: '700' }}>
                {(m.status || 'upcoming').toUpperCase()}
              </span>
            </div>
            {weekMatchups.map((matchup, i) => <MatchupCard key={i} matchup={matchup} />)}
          </div>
        );
      })}
    </div>
  );
};

const styles = {
  center: { textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' },
  backBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.875rem', padding: '0 0 0.75rem', display: 'flex', alignItems: 'center' },
  title: { fontSize: '1.4rem', fontWeight: '700', color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' },
  tab: { padding: '8px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  tabActive: { background: 'rgba(255,124,222,0.15)', borderColor: 'rgba(255,124,222,0.4)', color: 'var(--pink)' },
  empty: { textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)' },
  sectionTitle: { fontSize: '1rem', fontWeight: '600', color: '#fff', marginBottom: '12px' },
  currentCard: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,124,222,0.2)', borderRadius: '16px', padding: '24px', marginBottom: '1.5rem' },
  currentHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  weekLabel: { fontSize: '1rem', fontWeight: '700', color: '#fff' },
  dateRange: { fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' },
  statusPill: { padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '700' },
  vsRow: { display: 'flex', alignItems: 'center', gap: '24px', justifyContent: 'center' },
  teamScore: { textAlign: 'center', flex: 1 },
  teamScoreName: { fontSize: '1rem', marginBottom: '8px' },
  teamScorePoints: { fontSize: '2.5rem', fontWeight: '800', lineHeight: 1 },
  teamScoreLabel: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' },
  winnerBadge: { display: 'inline-block', background: 'rgba(255,124,222,0.15)', color: 'var(--pink)', borderRadius: '12px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: '700', marginTop: '8px' },
  vsLabel: { fontSize: '1.2rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', flexShrink: 0 },
  matchupRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '6px', border: '1px solid rgba(255,255,255,0.06)' },
  matchupScore: { fontSize: '0.9rem', fontWeight: '600', color: 'rgba(255,255,255,0.65)', minWidth: '90px', textAlign: 'center' },
  myMatchupTag: { background: 'rgba(255,124,222,0.15)', color: 'var(--pink)', borderRadius: '10px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: '700', flexShrink: 0 },
  weekBlock: { background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px' },
  weekBlockHeader: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' },
};

export default MatchupView;
