import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePwhlAuth } from '../../contexts/PwhlAuthContext';
import { pwhlFantasyAPI } from '../../services/pwhlAPI';

const DRAFT_STATUS_LABEL = {
  pending: 'Setup',
  in_progress: 'Drafting',
  completed: 'Active',
};

const DRAFT_STATUS_COLOR = {
  pending: { bg: 'rgba(255,193,7,0.15)', text: '#ffc107' },
  in_progress: { bg: 'rgba(0,200,83,0.15)', text: '#00c853' },
  completed: { bg: 'rgba(106,0,255,0.15)', text: 'var(--violet)' },
};

const LeagueBrowser = () => {
  const { isPwhlAuthenticated } = usePwhlAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('my');
  const [myLeagues, setMyLeagues] = useState([]);
  const [publicLeagues, setPublicLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
    if (!isPwhlAuthenticated) { setLoading(false); return; }
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [myRes, pubRes] = await Promise.all([
          pwhlFantasyAPI.getMyLeagues().catch(() => ({ data: [] })),
          pwhlFantasyAPI.getPublicLeagues().catch(() => ({ data: [] })),
        ]);
        setMyLeagues(myRes.data || []);
        setPublicLeagues(pubRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [isPwhlAuthenticated]);

  if (!isPwhlAuthenticated) {
    return (
      <div style={styles.authPrompt}>
        <i className="fas fa-trophy" style={{ fontSize: '3rem', color: 'var(--pink)', marginBottom: '16px' }} />
        <h3 style={{ color: '#fff', marginBottom: '8px' }}>Join a Fantasy League</h3>
        <p style={{ color: 'rgba(255,255,255,0.80)', marginBottom: '20px' }}>Sign in to your PWHL account to create or join leagues.</p>
        <button style={styles.primaryBtn} onClick={() => navigate('/login')}>Sign In</button>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.topRow}>
        <div style={styles.subTabs}>
          {[['my', 'My Leagues'], ['browse', 'Browse Public']].map(([id, label]) => (
            <button
              key={id}
              style={{ ...styles.subTab, ...(activeTab === id ? styles.subTabActive : {}) }}
              onClick={() => setActiveTab(id)}
            >{label}</button>
          ))}
        </div>
        <div style={styles.actions}>
          <button style={styles.secondaryBtn} onClick={() => setShowJoin(true)}>
            <i className="fas fa-sign-in-alt" style={{ marginRight: '6px' }} />Join with Code
          </button>
          <button style={styles.primaryBtn} onClick={() => setShowCreate(true)}>
            <i className="fas fa-plus" style={{ marginRight: '6px' }} />Create League
          </button>
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading leagues...</div>
      ) : activeTab === 'my' ? (
        <MyLeaguesTab leagues={myLeagues} navigate={navigate} />
      ) : (
        <PublicLeaguesTab leagues={publicLeagues} myLeagues={myLeagues} navigate={navigate} />
      )}

      {showCreate && <CreateLeagueModal onClose={() => setShowCreate(false)} onCreated={(league) => {
        setMyLeagues(prev => [league, ...prev]);
        setShowCreate(false);
        navigate(`/leagues/${league.id}`);
      }} />}

      {showJoin && <JoinLeagueModal onClose={() => setShowJoin(false)} onJoined={(league) => {
        setMyLeagues(prev => [league, ...prev]);
        setShowJoin(false);
        navigate(`/leagues/${league.id}`);
      }} />}
    </div>
  );
};

const MyLeaguesTab = ({ leagues, navigate }) => {
  if (leagues.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p style={{ color: 'rgba(255,255,255,0.80)' }}>You haven't joined any leagues yet. Create one or join with an invite code.</p>
      </div>
    );
  }
  return (
    <div style={styles.leaguesGrid}>
      {leagues.map(league => <LeagueCard key={league.id} league={league} navigate={navigate} />)}
    </div>
  );
};

const PublicLeaguesTab = ({ leagues, myLeagues, navigate }) => {
  const [search, setSearch] = useState('');
  const myLeagueIds = new Set(myLeagues.map(l => l.id));
  const filtered = leagues.filter(l => l.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ position: 'relative', maxWidth: '360px', marginBottom: '16px' }}>
        <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.50)', fontSize: '0.85rem' }} />
        <input
          type="text"
          placeholder="Search public leagues..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...styles.input, paddingLeft: '36px' }}
        />
      </div>
      {filtered.length === 0 ? (
        <div style={styles.emptyState}><p style={{ color: 'rgba(255,255,255,0.80)' }}>No public leagues found.</p></div>
      ) : (
        <div style={styles.leaguesGrid}>
          {filtered.map(league => (
            <LeagueCard key={league.id} league={league} navigate={navigate} isJoined={myLeagueIds.has(league.id)} />
          ))}
        </div>
      )}
    </div>
  );
};

const LeagueCard = ({ league, navigate, isJoined }) => {
  const [hovered, setHovered] = useState(false);
  const status = league.draft_status || 'pending';
  const statusStyle = DRAFT_STATUS_COLOR[status] || DRAFT_STATUS_COLOR.pending;
  const isDrafting = status === 'in_progress';
  const openSpots = (league.max_teams || 10) - (league.member_count || 0);

  return (
    <div
      style={{
        ...styles.leagueCard,
        ...(hovered ? styles.leagueCardHover : {}),
        ...(isDrafting ? { borderColor: 'rgba(0,200,83,0.3)', boxShadow: '0 0 0 1px rgba(0,200,83,0.15)' } : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/leagues/${league.id}`)}
    >
      <div style={styles.leagueCardTop}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.leagueName}>{league.name}</div>
          <div style={styles.leagueMeta}>{league.season} · {league.member_count || 0}/{league.max_teams || 10} teams · {league.draft_type === 'auction' ? 'Auction' : 'Snake'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
          <span style={{ ...styles.statusBadge, background: statusStyle.bg, color: statusStyle.text, display: 'flex', alignItems: 'center', gap: '5px' }}>
            {isDrafting && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00c853', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />}
            {DRAFT_STATUS_LABEL[status] || status}
          </span>
          {isJoined && (
            <span style={{ ...styles.statusBadge, background: 'rgba(255,124,222,0.15)', color: 'var(--pink)' }}>Joined</span>
          )}
        </div>
      </div>

      <div style={styles.leagueCardFooter}>
        <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem' }}>
          <i className="fas fa-users" style={{ marginRight: '5px' }} />{league.member_count || 0}/{league.max_teams || 10} members
        </span>
        {isDrafting ? (
          <button
            style={styles.draftBtn}
            onClick={e => { e.stopPropagation(); navigate(`/draft/${league.id}`); }}
          >
            <i className="fas fa-random" style={{ marginRight: '5px' }} />Enter Draft Room
          </button>
        ) : (
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
            {status === 'pending' ? 'Draft not started' : 'Season active'}
          </span>
        )}
      </div>
    </div>
  );
};

const CreateLeagueModal = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [maxTeams, setMaxTeams] = useState(10);
  const [isPublic, setIsPublic] = useState(false);
  const [draftType, setDraftType] = useState('snake');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (name.trim().length < 3) { setError('League name must be at least 3 characters'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await pwhlFantasyAPI.createLeague({ name: name.trim(), max_teams: maxTeams, is_public: isPublic, draft_type: draftType });
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create league');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create League" onClose={onClose}>
      {error && <div style={styles.errorMsg}>{error}</div>}
      <div style={styles.field}>
        <label style={styles.label}>League Name</label>
        <input value={name} onChange={e => setName(e.target.value)} style={styles.input} placeholder="My Awesome League" />
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Max Teams</label>
        <select value={maxTeams} onChange={e => setMaxTeams(Number(e.target.value))} style={styles.input}>
          {[6, 8, 10, 12, 14, 16].map(n => <option key={n} value={n}>{n} teams</option>)}
        </select>
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Draft Type</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['snake', 'auction'].map(t => (
            <button key={t} style={{ ...styles.secondaryBtn, ...(draftType === t ? styles.primaryBtn : {}) }} onClick={() => setDraftType(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div style={styles.field}>
        <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} style={{ accentColor: 'var(--pink)' }} />
          Make league public (browseable by others)
        </label>
      </div>
      <button style={{ ...styles.primaryBtn, width: '100%', opacity: loading ? 0.6 : 1 }} onClick={handleCreate} disabled={loading}>
        {loading ? 'Creating...' : 'Create League'}
      </button>
    </Modal>
  );
};

const JoinLeagueModal = ({ onClose, onJoined }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) { setError('Enter an invite code'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await pwhlFantasyAPI.joinLeague(code.trim().toUpperCase());
      onJoined(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid invite code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Join League" onClose={onClose}>
      {error && <div style={styles.errorMsg}>{error}</div>}
      <div style={styles.field}>
        <label style={styles.label}>Invite Code</label>
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          style={styles.input}
          placeholder="e.g. PWHL-XXXX"
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
        />
      </div>
      <button style={{ ...styles.primaryBtn, width: '100%', opacity: loading ? 0.6 : 1 }} onClick={handleJoin} disabled={loading}>
        {loading ? 'Joining...' : 'Join League'}
      </button>
    </Modal>
  );
};

const Modal = ({ title, onClose, children }) => (
  <div style={styles.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={styles.modalCard}>
      <div style={styles.modalHeader}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{title}</h3>
        <button onClick={onClose} style={styles.closeBtn}><i className="fas fa-times" /></button>
      </div>
      {children}
    </div>
  </div>
);

const styles = {
  authPrompt: { textAlign: 'center', padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '12px', flexWrap: 'wrap' },
  subTabs: { display: 'flex', gap: '8px' },
  subTab: { padding: '8px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  subTabActive: { background: 'rgba(255,124,222,0.15)', borderColor: 'rgba(255,124,222,0.4)', color: 'var(--pink)' },
  actions: { display: 'flex', gap: '8px' },
  primaryBtn: { background: 'linear-gradient(135deg, var(--pink), var(--violet))', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  secondaryBtn: { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.15)', padding: '9px 18px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  loading: { textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.65)' },
  emptyState: { textAlign: 'center', padding: '2.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' },
  leaguesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' },
  leagueCard: { background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', cursor: 'pointer', transition: 'all 0.2s ease' },
  leagueCardHover: { transform: 'translateY(-2px)', boxShadow: '0 8px 25px rgba(255,124,222,0.12)', borderColor: 'rgba(255,124,222,0.3)' },
  leagueCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' },
  leagueName: { fontSize: '1.05rem', fontWeight: '600', color: '#fff', marginBottom: '4px' },
  leagueMeta: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)' },
  statusBadge: { padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600' },
  leagueCardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.07)' },
  draftBtn: { background: 'linear-gradient(135deg, rgba(0,200,83,0.2), rgba(0,200,83,0.1))', border: '1px solid rgba(0,200,83,0.4)', color: '#00c853', padding: '5px 12px', borderRadius: '7px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modalCard: { background: '#1e0a3c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '420px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  closeBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.80)', cursor: 'pointer', fontSize: '1rem' },
  field: { marginBottom: '16px' },
  label: { display: 'block', color: 'rgba(255,255,255,0.88)', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' },
  errorMsg: { background: 'rgba(255,82,82,0.15)', border: '1px solid rgba(255,82,82,0.3)', color: '#ff5252', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.875rem' },
};

export default LeagueBrowser;
