import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PlayersTable from './PlayersTable';
import StandingsTable from './StandingsTable';
import ScheduleView from './ScheduleView';
import TradeAnalyzer from '../TradeAnalyzer';

const SUB_TABS = [
  { id: 'players',   label: 'Players',   icon: 'fas fa-user' },
  { id: 'standings', label: 'Standings', icon: 'fas fa-list-ol' },
  { id: 'schedule',  label: 'Schedule',  icon: 'fas fa-calendar-alt' },
];

const PWHLHub = () => {
  const [searchParams] = useSearchParams();
  // Default to Players tab when arriving with a ?team= filter (e.g. from Trends)
  const [activeTab, setActiveTab] = useState(searchParams.get('team') ? 'players' : 'players');
  const [hoveredTab, setHoveredTab] = useState(null);
  const [showAnalyzer, setShowAnalyzer] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'players':   return <PlayersTable />;
      case 'standings': return <StandingsTable />;
      case 'schedule':  return <ScheduleView />;
      default:          return <PlayersTable />;
    }
  };

  return (
    <div>
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
      {renderContent()}
      {showAnalyzer && <TradeAnalyzer onClose={() => setShowAnalyzer(false)} />}
    </div>
  );
};

const styles = {
  subTabBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '1.5rem',
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
};

export default PWHLHub;
