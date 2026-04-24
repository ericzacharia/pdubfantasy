import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PlayerAvatar from '../PlayerAvatar';
import { pwhlTrendsAPI, pwhlPlayersAPI, pwhlLeagueAPI } from '../../services/pwhlAPI';

const SEVERITY_STYLES = {
  positive: { icon: 'fas fa-arrow-trend-up', color: '#00c853', bg: 'rgba(0,200,83,0.08)', border: 'rgba(0,200,83,0.2)' },
  warning:  { icon: 'fas fa-arrow-trend-down', color: '#ff5252', bg: 'rgba(255,82,82,0.08)', border: 'rgba(255,82,82,0.2)' },
  info:     { icon: 'fas fa-circle-info', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
};

const WINDOW_OPTIONS = [
  { value: 5,  label: 'Last 5' },
  { value: 10, label: 'Last 10' },
  { value: 25, label: 'Last 25' },
];

const TrendsView = () => {
  const navigate = useNavigate();
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastN, setLastN] = useState(10);
  const [activeCategory, setActiveCategory] = useState('All');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [teamSearch, setTeamSearch] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  // team logo map: abbreviation → logo_url
  const [teamLogos, setTeamLogos] = useState({});
  // player headshot map: full_name → { headshot_url, id }
  const [playerData, setPlayerData] = useState({});

  useEffect(() => {
    // Load team logos once
    pwhlLeagueAPI.getStandings().then(r => {
      const map = {};
      (r.data || []).forEach(t => { map[t.abbreviation] = t.logo_url; });
      setTeamLogos(map);
    }).catch(() => {});

    // Load player data for headshots
    pwhlPlayersAPI.getPlayers({ page_size: 200, season: '2025-2026' }).then(r => {
      const map = {};
      (r.data?.players || []).forEach(p => {
        const name = `${p.first_name} ${p.last_name}`;
        map[name] = { headshot_url: p.headshot_url, id: p.id, slug: p.slug, position: p.position };
      });
      setPlayerData(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    pwhlTrendsAPI.getTrends({ last_n: lastN })
      .then(r => {
        setTrends(r.data?.trends || []);
        setLastUpdated(new Date());
      })
      .catch(() => setTrends([]))
      .finally(() => setLoading(false));
  }, [lastN]);

  const categoryCounts = trends.reduce((acc, t) => {
    if (t.category) acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {});
  const categories = ['All', ...new Set(trends.map(t => t.category).filter(Boolean))];

  // Apply all filters
  const filtered = useMemo(() => {
    let result = activeCategory === 'All' ? trends : trends.filter(t => t.category === activeCategory);
    if (teamSearch.trim()) {
      const q = teamSearch.trim().toLowerCase();
      result = result.filter(t => t.team?.toLowerCase().includes(q));
    }
    if (playerSearch.trim()) {
      const q = playerSearch.trim().toLowerCase();
      result = result.filter(t => t.player?.toLowerCase().includes(q));
    }
    return result;
  }, [trends, activeCategory, teamSearch, playerSearch]);

  const hasFilters = teamSearch || playerSearch || activeCategory !== 'All';

  return (
    <div>
      {/* Window toggle + updated */}
      <div style={styles.controlRow}>
        <div style={styles.windowToggle}>
          {WINDOW_OPTIONS.map(opt => (
            <button
              key={opt.value}
              style={{ ...styles.windowBtn, ...(lastN === opt.value ? styles.windowBtnActive : {}) }}
              onClick={() => setLastN(opt.value)}
            >{opt.label}</button>
          ))}
        </div>
        {lastUpdated && (
          <span style={styles.updated}>
            Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Team + player search */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <div className="pwhl-search-wrap" style={{ flex: 1, minWidth: '160px', maxWidth: '240px' }}>
          <i className="fas fa-shield-alt icon" />
          <input
            className="pwhl-input"
            type="text"
            placeholder="Filter by team..."
            value={teamSearch}
            onChange={e => setTeamSearch(e.target.value)}
            aria-label="Filter by team"
            style={{ paddingLeft: '34px' }}
          />
        </div>
        <div className="pwhl-search-wrap" style={{ flex: 1, minWidth: '160px', maxWidth: '240px' }}>
          <i className="fas fa-user icon" />
          <input
            className="pwhl-input"
            type="text"
            placeholder="Filter by player..."
            value={playerSearch}
            onChange={e => setPlayerSearch(e.target.value)}
            aria-label="Filter by player"
            style={{ paddingLeft: '34px' }}
          />
        </div>
        {hasFilters && (
          <button
            onClick={() => { setTeamSearch(''); setPlayerSearch(''); setActiveCategory('All'); }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.82rem', padding: '0 8px' }}
          >
            Clear filters
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', alignSelf: 'center' }}>
          {loading ? '…' : `${filtered.length} trend${filtered.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Category chips */}
      <div className="pwhl-filter-chips" style={{ marginBottom: '1.5rem' }}>
        {categories.map(cat => (
          <button
            key={cat}
            className={`pwhl-chip ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
            {cat !== 'All' && categoryCounts[cat] && (
              <span style={{ marginLeft: '5px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '0 6px', fontSize: '0.65rem', fontWeight: '700' }}>
                {categoryCounts[cat]}
              </span>
            )}
            {cat === 'All' && (
              <span style={{ marginLeft: '5px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '0 6px', fontSize: '0.65rem', fontWeight: '700' }}>
                {trends.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.loading}><i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }} />Loading trends...</div>
      ) : filtered.length === 0 ? (
        <div className="pwhl-empty">
          <div className="icon"><i className="fas fa-chart-line" /></div>
          <div className="label">No trends match your filters</div>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((trend, idx) => (
            <TrendCard
              key={trend.id}
              trend={trend}
              idx={idx}
              teamLogos={teamLogos}
              playerData={playerData}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TrendCard = ({ trend, idx, teamLogos, playerData, navigate }) => {
  const [hovered, setHovered] = useState(false);
  const sev = SEVERITY_STYLES[trend.severity] || SEVERITY_STYLES.info;
  const altBg = idx % 2 === 1 ? 'rgba(106,0,255,0.06)' : 'rgba(255,255,255,0.04)';
  const teamLogo = trend.team && teamLogos[trend.team];
  const playerInfo = trend.player && playerData[trend.player];

  return (
    <div
      style={{
        ...styles.card,
        background: hovered ? sev.bg : altBg,
        borderColor: hovered ? sev.border : 'rgba(255,255,255,0.08)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={styles.cardHeader}>
        <div style={styles.iconCircle}>
          <i className={sev.icon} style={{ color: sev.color, fontSize: '1rem' }} />
        </div>
        <span style={{ ...styles.categoryBadge, color: sev.color, background: sev.bg, borderColor: sev.border }}>
          {trend.category || 'General'}
        </span>
      </div>

      <h4 style={styles.cardTitle}>{trend.title}</h4>
      <p style={styles.cardDescription}>{trend.description}</p>

      {(trend.team || trend.player) && (
        <div style={styles.tagRow}>
          {trend.team && (
            <div
              style={{ ...styles.teamTag, cursor: 'pointer' }}
              onClick={() => navigate(`/hub?team=${encodeURIComponent(trend.team)}`)}
              title={`View ${trend.team} players`}
            >
              {teamLogo ? (
                <img
                  src={teamLogo}
                  alt={trend.team}
                  style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ) : (
                <i className="fas fa-shield-alt" style={{ fontSize: '0.7rem' }} />
              )}
              <span style={{ transition: 'color 0.15s' }}>{trend.team}</span>
            </div>
          )}
          {trend.player && (
            <div
              style={{ ...styles.playerTag, cursor: playerInfo?.id ? 'pointer' : 'default' }}
              onClick={() => playerInfo?.id && navigate(`/player/${playerInfo.slug || playerInfo.id}`)}
              title={playerInfo?.id ? 'View player profile' : trend.player}
            >
              <PlayerAvatar
                src={playerInfo?.headshot_url}
                name={trend.player}
                position={playerInfo?.position}
                size={20}
              />
              <span style={{ color: playerInfo?.id && hovered ? 'var(--pink)' : 'inherit', transition: 'color 0.15s' }}>
                {trend.player}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  controlRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' },
  windowToggle: { display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '3px' },
  windowBtn: { padding: '6px 16px', background: 'transparent', border: 'none', borderRadius: '6px', color: 'rgba(255,255,255,0.80)', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  windowBtnActive: { background: 'rgba(255,124,222,0.2)', color: 'var(--pink)' },
  updated: { fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)' },
  loading: { textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.65)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' },
  card: { borderRadius: '12px', border: '1px solid', padding: '18px', transition: 'all 0.2s ease' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  iconCircle: { width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  categoryBadge: { padding: '3px 10px', borderRadius: '12px', border: '1px solid', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' },
  cardTitle: { fontSize: '0.95rem', fontWeight: '700', color: '#fff', margin: '0 0 8px', lineHeight: '1.4' },
  cardDescription: { fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', margin: '0 0 12px', lineHeight: '1.5' },
  tagRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
  tag: { display: 'flex', alignItems: 'center', padding: '3px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: '20px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.80)' },
  teamTag: { display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: '20px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.80)' },
  playerTag: { display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: '20px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.80)', transition: 'all 0.15s' },
};

export default TrendsView;
