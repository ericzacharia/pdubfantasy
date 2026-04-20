import React, { useState, useEffect } from 'react';
import { pwhlLeagueAPI } from '../../services/pwhlAPI';

const ScheduleView = () => {
  const [upcoming, setUpcoming] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      try {
        const [upcomingRes, recentRes] = await Promise.all([
          pwhlLeagueAPI.getUpcomingGames().catch(() => ({ data: [] })),
          pwhlLeagueAPI.getGames({ status: 'final', limit: 20 }).catch(() => ({ data: [] })),
        ]);
        setUpcoming(upcomingRes.data || []);
        // Sort recent by date descending
        const recentData = (recentRes.data || []).sort(
          (a, b) => new Date(b.game_time || b.game_date) - new Date(a.game_time || a.game_date)
        );
        setRecent(recentData);
      } catch (err) {
        console.error('Error fetching games:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, []);

  const games = activeTab === 'upcoming' ? upcoming : recent;

  return (
    <div>
      {/* Toggle */}
      <div style={styles.toggleRow}>
        {['upcoming', 'results'].map(tab => (
          <button
            key={tab}
            style={{ ...styles.toggleBtn, ...(activeTab === tab ? styles.toggleBtnActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            <i className={tab === 'upcoming' ? 'fas fa-calendar-alt' : 'fas fa-flag-checkered'} style={{ marginRight: '7px' }} />
            {tab === 'upcoming' ? 'Upcoming' : 'Results'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.loading}>Loading games...</div>
      ) : games.length === 0 ? (
        <div style={styles.loading}>No games found</div>
      ) : (
        <div style={styles.gamesList}>
          {groupByDate(games).map(({ dateLabel, games: dayGames }) => (
            <div key={dateLabel} style={styles.dateGroup}>
              <div style={styles.dateLabel}>{dateLabel}</div>
              {dayGames.map((game, idx) => (
                <GameCard key={game.id || idx} game={game} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const GameCard = ({ game }) => {
  const [hovered, setHovered] = useState(false);
  const isLive = game.status === 'live';
  const isFinal = game.status === 'final';

  const statusLabel = isLive ? 'LIVE' : isFinal ? 'FINAL' : formatTime(game.game_time);
  const statusColor = isLive ? '#ff4444' : isFinal ? 'rgba(255,255,255,0.4)' : 'var(--pink)';

  return (
    <div
      style={{
        ...styles.gameCard,
        ...(hovered ? styles.gameCardHover : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Away team */}
      <TeamSide
        name={game.away_team_name || game.away_team}
        abbr={game.away_team}
        logo={game.away_logo_url}
        score={game.away_score}
        showScore={isFinal || isLive}
        isWinner={isFinal && game.away_score > game.home_score}
      />

      {/* Status / Score */}
      <div style={styles.gameCenter}>
        {(isFinal || isLive) ? (
          <div style={styles.scoreBlock}>
            <div style={styles.scoreDisplay}>
              <span style={{ color: game.away_score > game.home_score ? '#fff' : 'rgba(255,255,255,0.80)' }}>
                {game.away_score ?? 0}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.50)', margin: '0 8px' }}>–</span>
              <span style={{ color: game.home_score > game.away_score ? '#fff' : 'rgba(255,255,255,0.80)' }}>
                {game.home_score ?? 0}
              </span>
            </div>
            <div style={{ color: statusColor, fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.08em', marginTop: '4px' }}>
              {statusLabel}
              {game.is_overtime && ' (OT)'}
            </div>
          </div>
        ) : (
          <div style={styles.upcomingCenter}>
            <div style={{ color: 'var(--pink)', fontSize: '0.85rem', fontWeight: '600' }}>
              {statusLabel}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.50)', fontSize: '0.7rem', marginTop: '3px' }}>
              {game.venue || ''}
            </div>
          </div>
        )}
      </div>

      {/* Home team */}
      <TeamSide
        name={game.home_team_name || game.home_team}
        abbr={game.home_team}
        logo={game.home_logo_url}
        score={game.home_score}
        showScore={isFinal || isLive}
        isWinner={isFinal && game.home_score > game.away_score}
        alignRight
      />
    </div>
  );
};

const TeamSide = ({ name, abbr, logo, score, showScore, isWinner, alignRight }) => (
  <div style={{
    ...styles.teamSide,
    flexDirection: alignRight ? 'row-reverse' : 'row',
    textAlign: alignRight ? 'right' : 'left',
  }}>
    {logo ? (
      <img src={logo} alt={abbr} style={styles.teamLogo} onError={e => { e.target.style.display = 'none'; }} />
    ) : (
      <div style={styles.teamLogoPlaceholder}>{abbr?.slice(0, 2)}</div>
    )}
    <div>
      <div style={{
        fontSize: '0.85rem',
        fontWeight: isWinner ? '700' : '500',
        color: isWinner ? '#fff' : 'rgba(255,255,255,0.88)',
      }}>
        {name || abbr}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>{abbr}</div>
    </div>
  </div>
);

const groupByDate = (games) => {
  const groups = {};
  games.forEach(game => {
    const raw = game.game_time || game.game_date;
    const dateKey = raw ? new Date(raw).toDateString() : 'Unknown';
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(game);
  });
  return Object.entries(groups).map(([dateLabel, games]) => ({ dateLabel, games }));
};

const formatTime = (timeStr) => {
  if (!timeStr) return 'TBD';
  try {
    return new Date(timeStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  } catch {
    return timeStr;
  }
};

const styles = {
  toggleRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '1.5rem',
  },
  toggleBtn: {
    padding: '8px 20px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.85)',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
  },
  toggleBtnActive: {
    background: 'rgba(255,124,222,0.15)',
    borderColor: 'rgba(255,124,222,0.4)',
    color: 'var(--pink)',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    color: 'rgba(255,255,255,0.65)',
  },
  gamesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  dateGroup: {},
  dateLabel: {
    fontSize: '0.8rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'rgba(255,255,255,0.65)',
    marginBottom: '10px',
    paddingLeft: '4px',
  },
  gameCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
    marginBottom: '8px',
    transition: 'all 0.2s ease',
  },
  gameCardHover: {
    background: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  teamSide: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  teamLogo: {
    width: '40px',
    height: '40px',
    objectFit: 'contain',
    flexShrink: 0,
  },
  teamLogoPlaceholder: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.80)',
    flexShrink: 0,
  },
  gameCenter: {
    textAlign: 'center',
    minWidth: '100px',
    padding: '0 16px',
  },
  scoreBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  scoreDisplay: {
    fontSize: '1.4rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
  },
  upcomingCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
};

export default ScheduleView;
