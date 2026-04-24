import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PlayerAvatar from '../PlayerAvatar';
import PlayerStatusBadge from '../PlayerStatusBadge';
import { useWatchlist } from '../../hooks/useWatchlist';
import { pwhlPlayersAPI } from '../../services/pwhlAPI';
import playerInstagram from '../../data/playerInstagram.json';

// Matches Hub SKATER_COLS order/content (minus rank/name/jersey which are in hero)
const STAT_LABELS_SKATER = [
  { key: 'games_played',    label: 'GP' },
  { key: 'goals',           label: 'G' },
  { key: 'assists',         label: 'A' },
  { key: 'points',          label: 'PTS' },
  { key: 'plus_minus',      label: '+/-' },
  { key: 'shots',           label: 'SOG' },
  { key: 'pp_goals',        label: 'PPG' },
  { key: 'ptspg',           label: 'P/GP',  computed: true },
  { key: 'blocks',          label: 'BLK' },
  { key: 'penalty_minutes', label: 'PIM' },
  { key: 'fantasy_points',  label: 'FP',    highlight: true },
];

// Matches Hub GOALIE_COLS order/content
const STAT_LABELS_GOALIE = [
  { key: 'games_played',          label: 'GP' },
  { key: 'wins',                  label: 'W' },
  { key: 'losses',                label: 'L' },
  { key: 'saves',                 label: 'SV' },
  { key: 'save_percentage',       label: 'SV%',  decimals: 3 },
  { key: 'goals_against_average', label: 'GAA',  decimals: 2 },
  { key: 'goals_against',         label: 'GA' },
  { key: 'shutouts',              label: 'SO' },
  { key: 'fantasy_points',        label: 'FP',   highlight: true },
];

const PlayerDetail = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [allStats, setAllStats] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats');
  const [gameLog, setGameLog] = useState([]);
  const [sortStatKey, setSortStatKey] = useState(null);
  const [sortStatDir, setSortStatDir] = useState('desc');
  const { isWatched, toggle: toggleWatch } = useWatchlist();

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [playerRes, statsRes, newsRes] = await Promise.all([
          pwhlPlayersAPI.getPlayer(playerId),
          pwhlPlayersAPI.getPlayerStats(playerId).catch(() => ({ data: [] })),
          pwhlPlayersAPI.getPlayerNews(playerId).catch(() => ({ data: [] })),
        ]);
        setPlayer(playerRes.data);
        const allStats = statsRes.data || [];
        const seasonStats = allStats.filter(s => s.is_season_total);
        seasonStats.sort((a, b) => b.season.localeCompare(a.season));
        setAllStats(seasonStats);
        // Game log = per-game entries for current season, newest first
        const gameLogs = allStats.filter(s => !s.is_season_total && s.season === '2025-2026');
        gameLogs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        setGameLog(gameLogs.slice(0, 25));
        setNews(newsRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [playerId]);

  if (loading) return <div style={styles.center}>Loading player...</div>;
  if (!player) return <div style={styles.center}>Player not found.</div>;

  const isGoalie = player.position === 'G';
  const statLabels = isGoalie ? STAT_LABELS_GOALIE : STAT_LABELS_SKATER;
  const currentStats = player.season_stats || {};

  const getStatNumeric = (stats, stat) => {
    if (stat.key === 'ptspg') {
      const gp = stats.games_played || 0;
      const pts = stats.points ?? ((stats.goals ?? 0) + (stats.assists ?? 0));
      return gp > 0 ? pts / gp : 0;
    }
    return stats[stat.key] ?? 0;
  };

  const formatVal = (stats, stat) => {
    if (stat.key === 'ptspg') {
      const gp = stats.games_played || 0;
      const pts = stats.points ?? ((stats.goals ?? 0) + (stats.assists ?? 0));
      return gp > 0 ? (pts / gp).toFixed(2) : '—';
    }
    const val = stats[stat.key];
    if (val == null) return '—';
    if (stat.decimals) return Number(val).toFixed(stat.decimals);
    return val;
  };

  const handleStatSort = (key) => {
    if (sortStatKey === key) {
      setSortStatDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortStatKey(key);
      setSortStatDir('desc');
    }
  };

  // Sort seasons if a column header was clicked; otherwise default (newest first)
  const sortedStats = sortStatKey
    ? [...allStats].sort((a, b) => {
        const av = getStatNumeric(a, { key: sortStatKey });
        const bv = getStatNumeric(b, { key: sortStatKey });
        return sortStatDir === 'desc' ? bv - av : av - bv;
      })
    : allStats;

  return (
    <div style={styles.page}>
      {/* Back + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <button className="pwhl-back-btn" onClick={() => navigate('/hub')} aria-label="Back to players">
          <i className="fas fa-chevron-left" />Players
        </button>
        <button
          className={`pwhl-star ${isWatched(player?.id) ? 'active' : ''}`}
          style={{ fontSize: '1.1rem', padding: '6px 10px' }}
          onClick={() => toggleWatch(player.id)}
          aria-label={isWatched(player?.id) ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          <i className={isWatched(player?.id) ? 'fas fa-star' : 'far fa-star'} />
          <span style={{ fontSize: '0.78rem', marginLeft: '5px', color: 'var(--text-muted)' }}>
            {isWatched(player?.id) ? 'Watching' : 'Watch'}
          </span>
        </button>
      </div>

      {/* Hero */}
      <div style={styles.hero}>
        <PlayerAvatar
          src={player.headshot_url}
          name={`${player.first_name} ${player.last_name}`}
          position={player.position}
          size={96}
          style={{ border: '3px solid rgba(255,124,222,0.4)' }}
        />
        <div style={styles.heroInfo}>
          <h1 style={styles.playerName}>
            {player.first_name} {player.last_name}
            <PlayerStatusBadge status={player.status} note={player.status_note} size="md" />
          </h1>
          <div style={styles.playerMeta}>
            {player.team_logo_url && (
              <img src={player.team_logo_url} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
            )}
            <span>{player.team_abbreviation}</span>
            <span style={styles.metaDot}>·</span>
            <span style={styles.posBadge}>{player.position}</span>
            {player.jersey_number && (
              <>
                <span style={styles.metaDot}>·</span>
                <span>#{player.jersey_number}</span>
              </>
            )}
            {player.nationality && (
              <>
                <span style={styles.metaDot}>·</span>
                <span>{player.nationality}</span>
              </>
            )}
          </div>
          {/* Bio row */}
          <div style={styles.bioRow}>
            {player.birthdate && (
              <div style={styles.bioItem}>
                <span style={styles.bioLabel}>Born</span>
                <span style={styles.bioVal}>{player.birthdate}</span>
              </div>
            )}
            {player.height_cm && (
              <div style={styles.bioItem}>
                <span style={styles.bioLabel}>Height</span>
                <span style={styles.bioVal}>{Math.floor(player.height_cm / 30.48)}'{Math.round((player.height_cm % 30.48) / 2.54)}"</span>
              </div>
            )}
            {player.weight_kg && (
              <div style={styles.bioItem}>
                <span style={styles.bioLabel}>Weight</span>
                <span style={styles.bioVal}>{Math.round(player.weight_kg * 2.205)} lbs</span>
              </div>
            )}
            {player.shoots && (
              <div style={styles.bioItem}>
                <span style={styles.bioLabel}>{isGoalie ? 'Catches' : 'Shoots'}</span>
                <span style={styles.bioVal}>{player.shoots === 'L' ? 'Left' : 'Right'}</span>
              </div>
            )}
          </div>
          {playerInstagram[player.slug] && (
            <a
              href={playerInstagram[player.slug].url}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.instagramLink}
            >
              <i className="fab fa-instagram" style={{ fontSize: '1rem' }} />
              <span>@{playerInstagram[player.slug].handle}</span>
            </a>
          )}
        </div>

        {/* Current season FP spotlight */}
        <div style={styles.fpSpotlight}>
          <div style={styles.fpValue}>{(player.fantasy_value || 0).toFixed(1)}</div>
          <div style={styles.fpLabel}>Fantasy Points<br />2025-26</div>
        </div>
      </div>

      {/* Current season stat bar */}
      <div style={styles.statBar}>
        {statLabels.map(stat => (
          <div key={stat.key} style={styles.statBarItem}>
            <div style={{ ...styles.statBarVal, color: stat.highlight ? 'var(--pink)' : '#fff' }}>
              {formatVal(currentStats, stat)}
            </div>
            <div style={styles.statBarLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {[['stats', 'Season Stats'], ['gamelog', `Game Log (${gameLog.length})`], ['news', `News (${news.length})`]].map(([id, label]) => (
          <button
            key={id}
            style={{ ...styles.tab, ...(activeTab === id ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(id)}
          >{label}</button>
        ))}
      </div>

      {/* Stats tab — all seasons, sortable like Hub */}
      {activeTab === 'stats' && (
        <div style={styles.tableCard}>
          <div className="pwhl-table-scroll">
            <div style={{ minWidth: '520px' }}>
              <div style={styles.tableHeader}>
                <div style={{ ...styles.th, width: '100px', textAlign: 'left' }}>Season</div>
                {statLabels.map(stat => {
                  const isActive = sortStatKey === stat.key;
                  return (
                    <div
                      key={stat.key}
                      style={{ ...styles.th, flex: 1, textAlign: 'center', color: isActive || stat.highlight ? 'var(--pink)' : 'rgba(255,255,255,0.7)', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleStatSort(stat.key)}
                      title={'Sort by ' + stat.label}
                    >
                      {stat.label}
                      {isActive && (
                        <i className={'fas fa-caret-' + (sortStatDir === 'desc' ? 'down' : 'up')}
                          style={{ marginLeft: '3px', fontSize: '0.62rem' }} />
                      )}
                    </div>
                  );
                })}
              </div>
              {sortedStats.length === 0 ? (
                <div style={styles.emptyRow}>No season stats available</div>
              ) : (
                sortedStats.map((s, i) => (
                  <div key={i} style={{ ...styles.tableRow, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)' }}>
                    <div style={{ ...styles.td, width: '100px', color: '#fff', fontWeight: '600', fontSize: '0.82rem' }}>{s.season}</div>
                    {statLabels.map(stat => (
                      <div key={stat.key} style={{ ...styles.td, flex: 1, textAlign: 'center', color: stat.highlight ? 'var(--pink)' : 'rgba(255,255,255,0.88)', fontWeight: stat.highlight ? '700' : '400' }}>
                        {formatVal(s, stat)}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Game log tab */}
      {activeTab === 'gamelog' && (
        <div style={styles.tableCard}>
          <div className="pwhl-table-scroll">
            <div style={{ minWidth: isGoalie ? '420px' : '460px' }}>
              <div style={styles.tableHeader}>
                <div style={{ ...styles.th, width: '70px', textAlign: 'left' }}>Date</div>
                {(isGoalie
                  ? [{key:'goals_against',label:'GA'},{key:'saves',label:'SV'},{key:'save_percentage',label:'SV%',dec:3},{key:'wins',label:'W'},{key:'shutouts',label:'SO'},{key:'fantasy_points',label:'FP',hi:true}]
                  : [{key:'goals',label:'G'},{key:'assists',label:'A'},{key:'points',label:'PTS'},{key:'shots',label:'SOG'},{key:'plus_minus',label:'+/-'},{key:'penalty_minutes',label:'PIM'},{key:'fantasy_points',label:'FP',hi:true}]
                ).map(c => (
                  <div key={c.key} style={{ ...styles.th, flex:1, textAlign:'center', color: c.hi ? 'var(--pink)' : 'rgba(255,255,255,0.8)' }}>{c.label}</div>
                ))}
              </div>
              {gameLog.length === 0 ? (
                <div style={styles.emptyRow}>No individual game stats available for this season</div>
              ) : (
                gameLog.map((g, i) => {
                  const cols = isGoalie
                    ? [{key:'goals_against'},{key:'saves'},{key:'save_percentage',dec:3},{key:'wins'},{key:'shutouts'},{key:'fantasy_points',hi:true}]
                    : [{key:'goals'},{key:'assists'},{key:'points'},{key:'shots'},{key:'plus_minus'},{key:'penalty_minutes'},{key:'fantasy_points',hi:true}];
                  return (
                    <div key={i} style={{ ...styles.tableRow, background: i%2===0?'transparent':'rgba(255,255,255,0.03)' }}>
                      <div style={{ ...styles.td, width:'70px', color:'rgba(255,255,255,0.55)', fontSize:'0.78rem' }}>
                        {g.created_at ? new Date(g.created_at).toLocaleDateString('en-US',{month:'numeric',day:'numeric'}) : '—'}
                      </div>
                      {cols.map(c => (
                        <div key={c.key} style={{ ...styles.td, flex:1, textAlign:'center', color: c.hi ? 'var(--pink)' : 'rgba(255,255,255,0.88)', fontWeight: c.hi ? '700' : '400' }}>
                          {g[c.key] != null ? (c.dec ? Number(g[c.key]).toFixed(c.dec) : g[c.key]) : '0'}
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* News tab */}
      {activeTab === 'news' && (
        <div>
          {news.length === 0 ? (
            <div style={styles.emptyRow}>No recent news</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {news.map((item, i) => (
                <a
                  key={i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.newsCard}
                >
                  {item.thumbnail && (
                    <img src={item.thumbnail} alt="" style={styles.newsThumb} onError={e => { e.target.style.display = 'none'; }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={styles.newsTitle}>{item.title}</div>
                    <div style={styles.newsDate}>
                      {new Date(item.published_at || item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <i className="fas fa-external-link-alt" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', flexShrink: 0 }} />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { maxWidth: '900px' },
  center: { textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' },
  backBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.875rem', padding: '0 0 1rem', display: 'flex', alignItems: 'center' },
  hero: { display: 'flex', alignItems: 'flex-start', gap: '24px', padding: '1rem 0 1.5rem', flexWrap: 'wrap' },
  heroInfo: { flex: 1, minWidth: '200px' },
  playerName: { fontSize: '2rem', fontWeight: '800', color: '#fff', margin: '0 0 8px' },
  playerMeta: { display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '14px', flexWrap: 'wrap' },
  metaDot: { color: 'rgba(255,255,255,0.3)' },
  posBadge: { background: 'rgba(255,124,222,0.15)', color: 'var(--pink)', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700' },
  bioRow: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
  bioItem: { display: 'flex', flexDirection: 'column', gap: '2px' },
  bioLabel: { fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  bioVal: { fontSize: '0.875rem', color: '#fff', fontWeight: '500' },
  fpSpotlight: { textAlign: 'center', background: 'rgba(255,124,222,0.08)', border: '1px solid rgba(255,124,222,0.2)', borderRadius: '14px', padding: '16px 24px' },
  fpValue: { fontSize: '2.5rem', fontWeight: '800', color: 'var(--pink)', lineHeight: 1 },
  fpLabel: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '6px', lineHeight: '1.4' },
  statBar: { display: 'flex', gap: '4px', padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem', overflowX: 'auto' },
  statBarItem: { flex: 1, minWidth: '48px', textAlign: 'center' },
  statBarVal: { fontSize: '1.2rem', fontWeight: '700' },
  statBarLabel: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '3px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '1.25rem' },
  tab: { padding: '8px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' },
  tabActive: { background: 'rgba(255,124,222,0.15)', borderColor: 'rgba(255,124,222,0.4)', color: 'var(--pink)' },
  tableCard: { background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' },
  tableHeader: { display: 'flex', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' },
  th: { fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', padding: '0 4px' },
  tableRow: { display: 'flex', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' },
  td: { fontSize: '0.875rem', padding: '0 4px', color: 'rgba(255,255,255,0.85)' },
  emptyRow: { padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' },
  newsCard: { display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none', transition: 'all 0.2s' },
  newsThumb: { width: '64px', height: '48px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 },
  newsTitle: { fontSize: '0.9rem', color: '#fff', fontWeight: '500', lineHeight: '1.4', marginBottom: '4px' },
  newsDate: { fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' },
  instagramLink: { display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', textDecoration: 'none' },
};

export default PlayerDetail;
