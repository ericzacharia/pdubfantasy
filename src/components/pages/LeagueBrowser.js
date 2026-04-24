import React, { useState, useEffect, useCallback } from 'react';
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
  const { isPwhlAuthenticated, pwhlUser } = usePwhlAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('my');
  const [myLeagues, setMyLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
    if (!isPwhlAuthenticated) { setLoading(false); return; }
    pwhlFantasyAPI.getMyLeagues()
      .then(r => setMyLeagues(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
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
        <MyLeaguesTab leagues={myLeagues} navigate={navigate} userId={pwhlUser?.id} />
      ) : (
        <PublicLeaguesTab myLeagues={myLeagues} navigate={navigate} userId={pwhlUser?.id} />
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

const MyLeaguesTab = ({ leagues, navigate, userId }) => {
  if (leagues.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p style={{ color: 'rgba(255,255,255,0.80)' }}>You haven't joined any leagues yet. Create one or join with an invite code.</p>
      </div>
    );
  }
  return (
    <div style={styles.leaguesGrid}>
      {leagues.map(league => <LeagueCard key={league.id} league={league} navigate={navigate} userId={userId} />)}
    </div>
  );
};

const PublicLeaguesTab = ({ myLeagues, navigate, userId }) => {
  const myLeagueIds = new Set(myLeagues.map(l => l.id));
  const [search, setSearch]           = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [size, setSize]               = useState('');
  const [draftType, setDraftType]     = useState('');
  const [page, setPage]               = useState(1);
  const [data, setData]               = useState({ leagues: [], total: 0, pages: 1 });
  const [loading, setLoading]         = useState(true);
  const PAGE_SIZE = 20;

  const fetchLeagues = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (search)      params.q            = search;
      if (draftStatus) params.draft_status = draftStatus;
      if (size)        params.size         = size;
      if (draftType)   params.draft_type   = draftType;
      const res = await pwhlFantasyAPI.getPublicLeagues(params);
      setData(res.data || { leagues: [], total: 0, pages: 1 });
    } catch { setData({ leagues: [], total: 0, pages: 1 }); }
    finally { setLoading(false); }
  }, [search, draftStatus, size, draftType, page]);

  useEffect(() => {
    const t = setTimeout(fetchLeagues, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchLeagues, search]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, draftStatus, size, draftType]);

  return (
    <div>
      {/* Search + filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
        <div className="pwhl-search-wrap" style={{ flex: '1', minWidth: '200px', maxWidth: '340px' }}>
          <i className="fas fa-search icon" />
          <input className="pwhl-input" type="text" placeholder="Search leagues..." value={search}
            onChange={e => setSearch(e.target.value)} aria-label="Search leagues" />
        </div>

        <select value={draftStatus} onChange={e => setDraftStatus(e.target.value)} style={styles.filterSelect} aria-label="Filter by status">
          <option value="">All Status</option>
          <option value="pending">Setup</option>
          <option value="in_progress">Drafting</option>
          <option value="completed">Active</option>
        </select>

        <select value={size} onChange={e => setSize(e.target.value)} style={styles.filterSelect} aria-label="Filter by team count">
          <option value="">Any Size</option>
          {[6, 8, 10, 12, 16].map(n => <option key={n} value={n}>{n} Teams</option>)}
        </select>

        <select value={draftType} onChange={e => setDraftType(e.target.value)} style={styles.filterSelect} aria-label="Filter by draft type">
          <option value="">Any Draft</option>
          <option value="snake">Snake</option>
          <option value="auction">Auction</option>
        </select>

        <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
          {loading ? '…' : `${data.total.toLocaleString()} leagues`}
        </span>
      </div>

      {/* Results */}
      {loading ? (
        <div style={styles.loading}><i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }} />Loading leagues...</div>
      ) : data.leagues.length === 0 ? (
        <div style={styles.emptyState}><p style={{ color: 'rgba(255,255,255,0.70)' }}>No leagues match your filters.</p></div>
      ) : (
        <div style={styles.leaguesGrid}>
          {data.leagues.map(league => (
            <LeagueCard key={league.id} league={league} navigate={navigate}
              isJoined={myLeagueIds.has(league.id)} userId={userId} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data.pages > 1 && (
        <div style={styles.pagination}>
          <button className="pwhl-btn pwhl-btn-ghost" style={{ padding: '6px 14px' }}
            disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label="Previous page">
            <i className="fas fa-chevron-left" />
          </button>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
            Page {page} of {data.pages}
          </span>
          <button className="pwhl-btn pwhl-btn-ghost" style={{ padding: '6px 14px' }}
            disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} aria-label="Next page">
            <i className="fas fa-chevron-right" />
          </button>
        </div>
      )}
    </div>
  );
};

const LeagueCard = ({ league, navigate, isJoined, userId }) => {
  const [hovered, setHovered] = useState(false);
  const status = league.draft_status || 'pending';
  const statusStyle = DRAFT_STATUS_COLOR[status] || DRAFT_STATUS_COLOR.pending;
  const isDrafting = status === 'in_progress';
  const isCommissioner = userId && String(league.commissioner_id) === String(userId);

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
          <div style={styles.leagueName}>
            {isCommissioner && (
              <i className="fas fa-crown" title="You are the commissioner" style={{ color: '#ffc107', fontSize: '0.75rem', marginRight: '6px', verticalAlign: 'middle' }} />
            )}
            {league.name}
          </div>
          <div style={styles.leagueMeta}>{league.season} · {league.member_count || 0}/{league.max_teams || 10} teams · {league.draft_type === 'auction' ? 'Auction' : 'Snake'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
          <span style={{ ...styles.statusBadge, background: statusStyle.bg, color: statusStyle.text, display: 'flex', alignItems: 'center', gap: '5px' }}>
            {isDrafting && <span className="pwhl-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00c853', display: 'inline-block' }} />}
            {DRAFT_STATUS_LABEL[status] || status}
          </span>
          {isCommissioner && (
            <span style={{ ...styles.statusBadge, background: 'rgba(255,193,7,0.15)', color: '#ffc107', border: '1px solid rgba(255,193,7,0.3)' }}>
              <i className="fas fa-crown" style={{ marginRight: '4px', fontSize: '0.65rem' }} />Commissioner
            </span>
          )}
          {isJoined && !isCommissioner && (
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
  filterSelect: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', padding: '8px 12px', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' },
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
