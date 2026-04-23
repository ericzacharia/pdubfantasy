import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePwhlAuth } from '../../contexts/PwhlAuthContext';
import { pwhlFantasyAPI } from '../../services/pwhlAPI';
import LeagueStandings from './LeagueStandings';

const DRAFT_STATUS_COLOR = {
  pending: { bg: 'rgba(255,193,7,0.15)', text: '#ffc107', label: 'Setup' },
  in_progress: { bg: 'rgba(0,200,83,0.15)', text: '#00c853', label: 'Drafting' },
  completed: { bg: 'rgba(106,0,255,0.15)', text: 'var(--violet)', label: 'Active' },
};

const SUB_TABS = [
  { id: 'standings', label: 'Standings',  icon: 'fas fa-list-ol' },
  { id: 'teams',     label: 'Teams',      icon: 'fas fa-users' },
  { id: 'draft',     label: 'Draft',      icon: 'fas fa-random' },
];

const LeagueDetail = () => {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { isPwhlAuthenticated, pwhlUser } = usePwhlAuth();
  const [league, setLeague] = useState(null);
  const [teams, setTeams] = useState([]);
  const [myTeam, setMyTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('standings');
  const [copied, setCopied] = useState(false);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [teamError, setTeamError] = useState('');

  useEffect(() => {
    if (!isPwhlAuthenticated) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [leagueRes, teamsRes, myTeamsRes] = await Promise.all([
          pwhlFantasyAPI.getLeague(leagueId),
          pwhlFantasyAPI.getLeagueTeams(leagueId).catch(() => ({ data: [] })),
          pwhlFantasyAPI.getMyTeams().catch(() => ({ data: [] })),
        ]);
        setLeague(leagueRes.data);
        setTeams(teamsRes.data || []);
        const mine = (myTeamsRes.data || []).find(t => String(t.league_id) === String(leagueId));
        setMyTeam(mine || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [leagueId, isPwhlAuthenticated]);

  const copyInviteCode = () => {
    if (league?.invite_code) {
      navigator.clipboard.writeText(league.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) { setTeamError('Enter a team name'); return; }
    setTeamError('');
    try {
      const res = await pwhlFantasyAPI.createTeam(leagueId, newTeamName.trim());
      setMyTeam(res.data);
      setTeams(prev => [...prev, res.data]);
      setCreatingTeam(false);
    } catch (err) {
      setTeamError(err.response?.data?.detail || 'Failed to create team');
    }
  };

  if (!isPwhlAuthenticated) {
    return <div style={styles.center}><p style={{ color: 'rgba(255,255,255,0.80)' }}>Sign in to view league details.</p></div>;
  }
  if (loading) return <div style={styles.center}>Loading league...</div>;
  if (!league) return <div style={styles.center}>League not found.</div>;

  const statusInfo = DRAFT_STATUS_COLOR[league.draft_status] || DRAFT_STATUS_COLOR.pending;
  const isCommissioner = String(league.commissioner_id) === String(pwhlUser?.id);

  return (
    <div>
      {/* Back */}
      <button style={styles.backBtn} onClick={() => navigate('/leagues')}>
        <i className="fas fa-chevron-left" style={{ marginRight: '6px' }} />Leagues
      </button>

      {/* League header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.leagueName}>{league.name}</h2>
          <div style={styles.leagueMeta}>
            {league.season} · {league.member_count || teams.length}/{league.max_teams} teams ·{' '}
            {league.draft_type === 'auction' ? 'Auction' : 'Snake'} Draft
            {isCommissioner && <span style={{ color: 'var(--pink)', marginLeft: '8px' }}>(Commissioner)</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <span style={{ ...styles.statusBadge, background: statusInfo.bg, color: statusInfo.text }}>
            {statusInfo.label}
          </span>
          {league.invite_code && (
            <button style={styles.inviteBtn} onClick={copyInviteCode}>
              <i className={`fas fa-${copied ? 'check' : 'copy'}`} style={{ marginRight: '6px' }} />
              {copied ? 'Copied!' : league.invite_code}
            </button>
          )}
        </div>
      </div>

      {/* My team bar */}
      {myTeam ? (
        <div style={styles.myTeamBar}>
          <div>
            <span style={{ color: 'rgba(255,255,255,0.80)', fontSize: '0.8rem' }}>My Team</span>
            <div style={{ fontWeight: '600', color: '#fff' }}>{myTeam.name}</div>
          </div>
          <div style={styles.myTeamActions}>
            <button style={styles.actionBtn} onClick={() => navigate(`/pwhl/teams/${myTeam.id}`)}>
              <i className="fas fa-users" style={{ marginRight: '6px' }} />Roster & Lineup
            </button>
            <button style={styles.actionBtn} onClick={() => navigate(`/pwhl/waivers/${leagueId}/${myTeam.id}`)}>
              <i className="fas fa-exchange-alt" style={{ marginRight: '6px' }} />Waivers
            </button>
            <button style={styles.actionBtn} onClick={() => navigate(`/pwhl/trades/${leagueId}/${myTeam.id}`)}>
              <i className="fas fa-handshake" style={{ marginRight: '6px' }} />Trades
            </button>
            {league.draft_status === 'completed' && (
              <button style={styles.actionBtn} onClick={() => navigate(`/matchup/${leagueId}`)}>
                <i className="fas fa-hockey-puck" style={{ marginRight: '6px' }} />Matchup
              </button>
            )}
            {league.draft_status !== 'completed' && (
              <button style={styles.primaryBtn} onClick={() => navigate(`/pwhl/draft/${leagueId}`)}>
                <i className="fas fa-random" style={{ marginRight: '6px' }} />
                {league.draft_status === 'in_progress' ? 'Go to Draft' : 'Draft Room'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={styles.noTeamBar}>
          {creatingTeam ? (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                placeholder="Team name"
                style={{ ...styles.input, maxWidth: '220px' }}
                onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
              />
              {teamError && <span style={{ color: '#ff5252', fontSize: '0.85rem' }}>{teamError}</span>}
              <button style={styles.primaryBtn} onClick={handleCreateTeam}>Create Team</button>
              <button style={styles.cancelBtn} onClick={() => setCreatingTeam(false)}>Cancel</button>
            </div>
          ) : (
            <>
              <span style={{ color: 'rgba(255,255,255,0.80)' }}>You don't have a team in this league.</span>
              <button style={styles.primaryBtn} onClick={() => setCreatingTeam(true)}>
                <i className="fas fa-plus" style={{ marginRight: '6px' }} />Join as Team
              </button>
            </>
          )}
        </div>
      )}

      {/* Sub tabs */}
      <div style={styles.subTabBar}>
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            style={{ ...styles.subTab, ...(activeTab === tab.id ? styles.subTabActive : {}) }}
            onClick={() => setActiveTab(tab.id)}
          >
            <i className={tab.icon} style={{ marginRight: '7px', fontSize: '0.8rem' }} />{tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'standings' && <LeagueStandings leagueId={leagueId} navigate={navigate} />}
      {activeTab === 'teams' && <TeamsTab teams={teams} navigate={navigate} myTeamId={myTeam?.id} />}
      {activeTab === 'draft' && <DraftTab league={league} navigate={navigate} leagueId={leagueId} />}
    </div>
  );
};

const TeamsTab = ({ teams, navigate, myTeamId }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
    {teams.map(team => (
      <div
        key={team.id}
        style={{
          ...styles.teamCard,
          borderColor: team.id === myTeamId ? 'rgba(255,124,222,0.3)' : 'rgba(255,255,255,0.1)',
        }}
        onClick={() => navigate(`/pwhl/teams/${team.id}`)}
      >
        <div style={{ fontWeight: '600', color: '#fff', marginBottom: '4px' }}>{team.name}</div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)' }}>
          {team.wins}-{team.losses}-{team.ties} · {team.total_points?.toFixed(1) || '0.0'} FP
        </div>
        {team.id === myTeamId && (
          <span style={{ ...styles.statusBadge, background: 'rgba(255,124,222,0.15)', color: 'var(--pink)', marginTop: '8px', display: 'inline-block' }}>My Team</span>
        )}
      </div>
    ))}
  </div>
);

const DraftTab = ({ league, navigate, leagueId }) => (
  <div style={styles.draftTab}>
    {league.draft_status === 'pending' && (
      <div style={styles.draftInfo}>
        <i className="fas fa-clock" style={{ fontSize: '2rem', color: '#ffc107', marginBottom: '12px' }} />
        <h4 style={{ color: '#fff', margin: '0 0 8px' }}>Draft Pending</h4>
        <p style={{ color: 'rgba(255,255,255,0.80)', marginBottom: '16px' }}>The draft hasn't started yet. The commissioner will start it when all teams have joined.</p>
      </div>
    )}
    {league.draft_status === 'in_progress' && (
      <div style={styles.draftInfo}>
        <i className="fas fa-circle" style={{ fontSize: '1rem', color: '#ff4444', marginBottom: '12px' }} />
        <h4 style={{ color: '#fff', margin: '0 0 8px' }}>Draft In Progress</h4>
        <button style={styles.primaryBtn} onClick={() => navigate(`/pwhl/draft/${leagueId}`)}>
          <i className="fas fa-random" style={{ marginRight: '6px' }} />Enter Draft Room
        </button>
      </div>
    )}
    {league.draft_status === 'completed' && (
      <div style={styles.draftInfo}>
        <i className="fas fa-check-circle" style={{ fontSize: '2rem', color: '#00c853', marginBottom: '12px' }} />
        <h4 style={{ color: '#fff', margin: '0 0 8px' }}>Draft Complete</h4>
        <button style={styles.secondaryBtn} onClick={() => navigate(`/pwhl/draft/${leagueId}`)}>
          View Draft Results
        </button>
      </div>
    )}
  </div>
);

const styles = {
  center: { textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.80)' },
  backBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.80)', cursor: 'pointer', fontSize: '0.875rem', padding: '0 0 1rem', display: 'flex', alignItems: 'center' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', gap: '12px', flexWrap: 'wrap' },
  leagueName: { fontSize: '1.6rem', fontWeight: '700', color: '#fff', margin: '0 0 6px' },
  leagueMeta: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.80)' },
  statusBadge: { padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600' },
  inviteBtn: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.88)', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', fontFamily: 'monospace', letterSpacing: '0.05em' },
  myTeamBar: { background: 'rgba(255,124,222,0.07)', border: '1px solid rgba(255,124,222,0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  myTeamActions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  noTeamBar: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px 20px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  subTabBar: { display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' },
  subTab: { padding: '8px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center' },
  subTabActive: { background: 'rgba(255,124,222,0.15)', borderColor: 'rgba(255,124,222,0.4)', color: 'var(--pink)' },
  teamCard: { background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px solid', padding: '16px', cursor: 'pointer', transition: 'all 0.2s' },
  draftTab: { display: 'flex', justifyContent: 'center', padding: '2rem 0' },
  draftInfo: { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  primaryBtn: { background: 'linear-gradient(135deg, var(--pink), var(--violet))', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  secondaryBtn: { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.15)', padding: '9px 18px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  actionBtn: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.92)', padding: '7px 14px', borderRadius: '7px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' },
  cancelBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontSize: '0.875rem' },
  input: { width: '100%', padding: '9px 13px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' },
};

export default LeagueDetail;
