import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePwhlAuth } from '../../contexts/PwhlAuthContext';
import { pwhlFantasyAPI, pwhlLeagueAPI } from '../../services/pwhlAPI';

const PWHLHome = () => {
  const { isPwhlAuthenticated, pwhlUser } = usePwhlAuth();
  const navigate = useNavigate();
  const [myTeams, setMyTeams] = useState([]);
  const [news, setNews] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredAction, setHoveredAction] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch news/articles (public, no auth required)
        const [newsRes, articlesRes] = await Promise.all([
          pwhlLeagueAPI.getNews().catch(() => ({ data: [] })),
          pwhlLeagueAPI.getArticles().catch(() => ({ data: { articles: [] } })),
        ]);
        setNews(newsRes.data || []);
        setArticles(articlesRes.data?.articles || []);

        // Fetch fantasy teams if authenticated
        if (isPwhlAuthenticated) {
          const teamsRes = await pwhlFantasyAPI.getMyTeams().catch(() => ({ data: [] }));
          setMyTeams(teamsRes.data || []);
        }
      } catch (err) {
        console.error('Error fetching home data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isPwhlAuthenticated]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: { bg: 'rgba(255,193,7,0.2)', text: '#ffc107', label: 'Setup' },
      in_progress: { bg: 'rgba(0,200,83,0.2)', text: '#00c853', label: 'Drafting' },
      completed: { bg: 'rgba(106,0,255,0.2)', text: 'var(--violet)', label: 'Active' },
    };
    const c = colors[status] || colors.pending;
    return (
      <span style={{ background: c.bg, color: c.text, padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600' }}>
        {c.label}
      </span>
    );
  };

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <div>
      {/* Welcome / Hero */}
      {isPwhlAuthenticated ? (
        <div style={styles.welcome}>
          <h2 style={styles.welcomeText}>
            {getGreeting()}, {pwhlUser?.username || 'Player'}
          </h2>
        </div>
      ) : (
        <div style={styles.hero}>
          <h2 style={styles.heroTitle}>PWHL Fantasy Hockey</h2>
          <p style={styles.heroSubtitle}>
            Build your team, compete in leagues, and track live scoring across the Professional Women's Hockey League.
          </p>
          <div style={styles.heroActions}>
            <button style={styles.heroPrimary} onClick={() => navigate('/register')}>
              Get Started
            </button>
            <button style={styles.heroSecondary} onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </div>
      )}

      {/* My Fantasy Teams */}
      {isPwhlAuthenticated && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <i className="fas fa-users" style={{ marginRight: '8px', color: 'var(--pink)' }} />
            My Fantasy Teams
          </h3>
          {myTeams.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '16px' }}>
                You haven't joined any leagues yet.
              </p>
              <button style={styles.heroPrimary} onClick={() => navigate('/leagues')}>
                Browse Leagues
              </button>
            </div>
          ) : (
            <div style={styles.teamsGrid}>
              {myTeams.map((team, idx) => (
                <div
                  key={team.id}
                  style={{
                    ...styles.teamCard,
                    ...(hoveredCard === idx ? styles.teamCardHover : {}),
                  }}
                  onMouseEnter={() => setHoveredCard(idx)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div style={styles.teamHeader}>
                    <div>
                      <div style={styles.teamName}>{team.name}</div>
                      <div style={styles.leagueName}>{team.league_name}</div>
                    </div>
                    {getStatusBadge(team.league_status)}
                  </div>
                  <div style={styles.teamStats}>
                    <div style={styles.stat}>
                      <span style={styles.statValue}>{team.wins}-{team.losses}-{team.ties}</span>
                      <span style={styles.statLabel}>Record</span>
                    </div>
                    <div style={styles.stat}>
                      <span style={styles.statValue}>{team.total_points?.toFixed(1) || '0.0'}</span>
                      <span style={styles.statLabel}>FP</span>
                    </div>
                    <div style={styles.stat}>
                      <span style={styles.statValue}>#{team.rank || '-'}</span>
                      <span style={styles.statLabel}>Rank</span>
                    </div>
                  </div>
                  <div style={styles.teamActions}>
                    {[
                      { label: 'My Team', icon: 'fas fa-users', path: `/teams/${team.id}` },
                      { label: 'Waivers', icon: 'fas fa-exchange-alt', path: `/waivers/${team.league_id}/${team.id}` },
                      { label: 'Trades', icon: 'fas fa-handshake', path: `/trades/${team.league_id}/${team.id}` },
                      { label: 'Standings', icon: 'fas fa-list-ol', path: `/leagues/${team.league_id}` },
                    ].map((action) => (
                      <button
                        key={action.label}
                        style={{
                          ...styles.actionBtn,
                          ...(hoveredAction === `${idx}-${action.label}` ? styles.actionBtnHover : {}),
                        }}
                        onClick={() => navigate(action.path)}
                        onMouseEnter={() => setHoveredAction(`${idx}-${action.label}`)}
                        onMouseLeave={() => setHoveredAction(null)}
                      >
                        <i className={action.icon} style={{ fontSize: '0.75rem' }} />
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Articles */}
      {articles.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <i className="fas fa-newspaper" style={{ marginRight: '8px', color: 'var(--pink)' }} />
            PWHL Analysis
          </h3>
          <div style={styles.newsGrid}>
            {articles.slice(0, 6).map((article, idx) => (
              <a
                key={article.id || idx}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...styles.newsCard,
                  ...(hoveredCard === `article-${idx}` ? styles.newsCardHover : {}),
                }}
                onMouseEnter={() => setHoveredCard(`article-${idx}`)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {article.thumbnail && (
                  <img src={article.thumbnail} alt="" style={styles.newsThumbnail} />
                )}
                <div style={styles.newsBody}>
                  <div style={styles.newsTitle}>{article.title}</div>
                  {article.summary && (
                    <div style={styles.newsSummary}>{article.summary}</div>
                  )}
                  <div style={styles.newsDate}>
                    {article.date || new Date(article.published_at).toLocaleDateString()}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* News Feed */}
      {news.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <i className="fas fa-rss" style={{ marginRight: '8px', color: 'var(--pink)' }} />
            Latest News
          </h3>
          <div style={styles.newsGrid}>
            {news.slice(0, 6).map((item, idx) => (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...styles.newsCard,
                  ...(hoveredCard === `news-${idx}` ? styles.newsCardHover : {}),
                }}
                onMouseEnter={() => setHoveredCard(`news-${idx}`)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {item.thumbnail && (
                  <img src={item.thumbnail} alt="" style={styles.newsThumbnail} />
                )}
                <div style={styles.newsBody}>
                  <div style={styles.newsTitle}>{item.title}</div>
                  <div style={styles.newsDate}>
                    {item.date || new Date(item.published_at).toLocaleDateString()}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  loading: {
    textAlign: 'center',
    padding: '4rem 0',
    color: 'rgba(255,255,255,0.80)',
    fontSize: '1.1rem',
  },
  welcome: {
    padding: '1rem 0 0.5rem',
  },
  welcomeText: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#fff',
    margin: 0,
  },
  hero: {
    textAlign: 'center',
    padding: '3rem 1rem',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    marginBottom: '2rem',
  },
  heroTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '12px',
  },
  heroSubtitle: {
    fontSize: '1.05rem',
    color: 'rgba(255,255,255,0.85)',
    maxWidth: '600px',
    margin: '0 auto 24px',
    lineHeight: '1.6',
  },
  heroActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  heroPrimary: {
    background: 'linear-gradient(135deg, var(--pink), var(--violet))',
    color: '#fff',
    border: 'none',
    padding: '12px 28px',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  heroSecondary: {
    background: 'transparent',
    color: 'var(--pink)',
    border: '1px solid var(--pink)',
    padding: '12px 28px',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  section: {
    marginTop: '2rem',
  },
  sectionTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '1rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '2rem',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  teamsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '16px',
  },
  teamCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    padding: '20px',
    transition: 'all 0.3s ease',
  },
  teamCardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(255,124,222,0.15)',
    borderColor: 'rgba(255,124,222,0.3)',
  },
  teamHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  teamName: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#fff',
  },
  leagueName: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.80)',
    marginTop: '2px',
  },
  teamStats: {
    display: 'flex',
    gap: '24px',
    marginBottom: '16px',
    padding: '12px 0',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statValue: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--pink)',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.65)',
    marginTop: '2px',
  },
  teamActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'rgba(255,255,255,0.88)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  actionBtnHover: {
    background: 'rgba(255,124,222,0.15)',
    borderColor: 'rgba(255,124,222,0.3)',
    color: '#fff',
  },
  newsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  newsCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    overflow: 'hidden',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    display: 'block',
  },
  newsCardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(255,124,222,0.15)',
    borderColor: 'rgba(255,124,222,0.3)',
  },
  newsThumbnail: {
    width: '100%',
    height: '160px',
    objectFit: 'cover',
  },
  newsBody: {
    padding: '16px',
  },
  newsTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#fff',
    lineHeight: '1.4',
    marginBottom: '6px',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  newsSummary: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.80)',
    lineHeight: '1.4',
    marginBottom: '8px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  newsDate: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.55)',
  },
};

export default PWHLHome;
