import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PlayerAvatar from '../PlayerAvatar';
import { pwhlPlayersAPI } from '../../services/pwhlAPI';

const STAT_LABELS_SKATER = [
  { key: 'games_played',    label: 'GP' },
  { key: 'goals',           label: 'G' },
  { key: 'assists',         label: 'A' },
  { key: 'points',          label: 'PTS' },
  { key: 'plus_minus',      label: '+/-' },
  { key: 'shots',           label: 'SOG' },
  { key: 'penalty_minutes', label: 'PIM' },
  { key: 'fantasy_points',  label: 'FP',  highlight: true },
];

const STAT_LABELS_GOALIE = [
  { key: 'games_played',          label: 'GP' },
  { key: 'wins',                  label: 'W' },
  { key: 'losses',                label: 'L' },
  { key: 'saves',                 label: 'SV' },
  { key: 'goals_against',         label: 'GA' },
  { key: 'shutouts',              label: 'SO' },
  { key: 'save_percentage',       label: 'SV%',  decimals: 3 },
  { key: 'goals_against_average', label: 'GAA',  decimals: 2 },
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
        // Season totals only, sorted newest first
        const seasonStats = (statsRes.data || []).filter(s => s.is_season_total);
        seasonStats.sort((a, b) => b.season.localeCompare(a.season));
        setAllStats(seasonStats);
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

  const formatVal = (stats, stat) => {
    const val = stats[stat.key];
    if (val == null) return '—';
    if (stat.decimals) return Number(val).toFixed(stat.decimals);
    return val;
  };

  return (
    <div style={styles.page}>
      {/* Back */}
      <button style={styles.backBtn} onClick={() => navigate(-1)}>
        <i className="fas fa-chevron-left" style={{ marginRight: '6px' }} />Back
      </button>

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
          <h1 style={styles.playerName}>{player.first_name} {player.last_name}</h1>
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
        {[['stats', 'Season Stats'], ['news', `News (${news.length})`]].map(([id, label]) => (
          <button
            key={id}
            style={{ ...styles.tab, ...(activeTab === id ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(id)}
          >{label}</button>
        ))}
      </div>

      {/* Stats tab — all seasons */}
      {activeTab === 'stats' && (
        <div style={styles.tableCard}>
          <div className="pwhl-table-scroll">
            <div style={{ minWidth: '480px' }}>
              {/* Header */}
              <div style={styles.tableHeader}>
                <div style={{ ...styles.th, width: '110px', textAlign: 'left' }}>Season</div>
                {statLabels.map(stat => (
                  <div key={stat.key} style={{ ...styles.th, flex: 1, textAlign: 'center', color: stat.highlight ? 'var(--pink)' : 'rgba(255,255,255,0.8)' }}>
                    {stat.label}
                  </div>
                ))}
              </div>
              {allStats.length === 0 ? (
                <div style={styles.emptyRow}>No season stats available</div>
              ) : (
                allStats.map((s, i) => (
                  <div key={i} style={{ ...styles.tableRow, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <div style={{ ...styles.td, width: '110px', color: '#fff', fontWeight: '600' }}>{s.season}</div>
                    {statLabels.map(stat => (
                      <div key={stat.key} style={{ ...styles.td, flex: 1, textAlign: 'center', color: stat.highlight ? 'var(--pink)' : 'rgba(255,255,255,0.9)', fontWeight: stat.highlight ? '700' : '400' }}>
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
                    <div style={styles.newsDate}>{item.date || new Date(item.published_at).toLocaleDateString()}</div>
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
};

export default PlayerDetail;
