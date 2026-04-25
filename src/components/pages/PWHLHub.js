import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PlayersTable from './PlayersTable';
import StandingsTable from './StandingsTable';
import ScheduleView from './ScheduleView';
import TradeAnalyzer from '../TradeAnalyzer';
import { useWatchlist } from '../../hooks/useWatchlist';

const SEASONS = ['2025-2026', '2024-2025', '2024'];

const SUB_TABS = [
  { id: 'skaters',   label: 'Skaters',   icon: 'fas fa-hockey-puck' },
  { id: 'goalies',   label: 'Goalies',   icon: 'fas fa-mask' },
  { id: 'standings', label: 'Standings', icon: 'fas fa-list-ol' },
  { id: 'schedule',  label: 'Schedule',  icon: 'fas fa-calendar-alt' },
];

const PWHLHub = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('team') ? 'skaters' : 'skaters');
  const [hoveredTab, setHoveredTab] = useState(null);
  const [showAnalyzer, setShowAnalyzer] = useState(false);

  // Shared player controls — lifted from PlayersTable
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [search, setSearch] = useState('');
  const [perGame, setPerGame] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState('2025-2026');
  const { watchlist } = useWatchlist();

  const isPlayerTab = activeTab === 'skaters' || activeTab === 'goalies';

  const renderContent = () => {
    switch (activeTab) {
      case 'skaters':
        return <PlayersTable playerType="skaters" showWatchlist={showWatchlist} search={search} perGame={perGame} selectedSeason={selectedSeason} />;
      case 'goalies':
        return <PlayersTable playerType="goalies" showWatchlist={showWatchlist} search={search} perGame={perGame} selectedSeason={selectedSeason} />;
      case 'standings':
        return <StandingsTable />;
      case 'schedule':
        return <ScheduleView />;
      default:
        return <PlayersTable playerType="skaters" showWatchlist={showWatchlist} search={search} perGame={perGame} selectedSeason={selectedSeason} />;
    }
  };

  return (
    <div>
      {/* Tab bar */}
      <div style={styles.subTabBar}>
        {SUB_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const isHovered = hoveredTab === tab.id;
          return (
            <button
              key={tab.id}
              style={{
                ...styles.subTabBtn,
                ...(isActive ? styles.subTabBtnActive : {}),
                ...(isHovered && !isActive ? styles.subTabBtnHover : {}),
              }}
              onClick={() => setActiveTab(tab.id)}
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
            >
              <i className={tab.icon} style={{ marginRight: '7px', fontSize: '0.85rem' }} />
              {tab.label}
            </button>
          );
        })}
        <button
          style={{ ...styles.subTabBtn, marginLeft: 'auto', background: 'rgba(255,124,222,0.08)', borderColor: 'rgba(255,124,222,0.2)', color: 'var(--pink)' }}
          onClick={() => setShowAnalyzer(true)}
        >
          <i className="fas fa-balance-scale" style={{ marginRight: '7px', fontSize: '0.85rem' }} />
          Compare Players
        </button>
      </div>

      {/* Sub-controls row — only shown for player tabs */}
      {isPlayerTab && (
        <div style={styles.controlsRow}>
          {/* Watchlist toggle */}
          <button
            className={`pwhl-chip ${showWatchlist ? 'active' : ''}`}
            onClick={() => setShowWatchlist(w => !w)}
            aria-pressed={showWatchlist}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}
          >
            <i className={showWatchlist ? 'fas fa-star' : 'far fa-star'} style={{ fontSize: '0.75rem' }} />
            Watchlist
            {watchlist.size > 0 && (
              <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '0 6px', fontSize: '0.65rem', fontWeight: '700' }}>
                {watchlist.size}
              </span>
            )}
          </button>

          {/* Search */}
          <div className="pwhl-search-wrap" style={{ flex: 1, maxWidth: '280px' }}>
            <i className="fas fa-search icon" />
            <input
              className="pwhl-input"
              type="text"
              placeholder="Search players..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search players"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}
                aria-label="Clear search"
              >
                <i className="fas fa-times" />
              </button>
            )}
          </div>

          {/* Totals / Per Game toggle */}
          <button
            style={{ ...styles.toggleBtn, ...(perGame ? styles.toggleBtnActive : {}), flexShrink: 0 }}
            onClick={() => setPerGame(p => !p)}
            title="Toggle between season totals and per-game averages"
          >
            {perGame ? 'Per Game' : 'Totals'}
          </button>

          {/* Season dropdown */}
          <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)} style={{ ...styles.select, flexShrink: 0 }}>
            {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {renderContent()}
      {showAnalyzer && <TradeAnalyzer onClose={() => setShowAnalyzer(false)} />}
    </div>
  );
};

const styles = {
  subTabBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  subTabBtn: {
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
  subTabBtnActive: {
    background: 'rgba(255,124,222,0.15)',
    borderColor: 'rgba(255,124,222,0.4)',
    color: 'var(--pink)',
  },
  subTabBtnHover: {
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
  },
  controlsRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  toggleBtn: {
    padding: '6px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  toggleBtnActive: {
    background: 'rgba(255,124,222,0.15)',
    borderColor: 'rgba(255,124,222,0.4)',
    color: 'var(--pink)',
  },
  select: {
    background: '#1e0a3c',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#fff',
    padding: '6px 10px',
    fontSize: '0.82rem',
    cursor: 'pointer',
  },
};

export default PWHLHub;
