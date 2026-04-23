import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { usePwhlAuth } from '../../contexts/PwhlAuthContext';

const tabs = [
  { id: 'home',     path: '/',          label: 'Home',     icon: 'fas fa-home' },
  { id: 'hub',      path: '/hub',      label: 'PWHL Hub', icon: 'fas fa-hockey-puck' },
  { id: 'leagues',  path: '/leagues',  label: 'Leagues',  icon: 'fas fa-trophy' },
  { id: 'trends',   path: '/trends',   label: 'Trends',   icon: 'fas fa-chart-line' },
  { id: 'settings', path: '/settings',  label: 'More',     icon: 'fas fa-ellipsis-h' },
];

const PWHLLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPwhlAuthenticated } = usePwhlAuth();
  const [hoveredTab, setHoveredTab] = React.useState(null);

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/' || path === '/') return 'home';
    if (path.startsWith('/hub')) return 'hub';
    if (path.startsWith('/leagues') || path.startsWith('/teams') || path.startsWith('/draft') || path.startsWith('/waivers') || path.startsWith('/trades') || path.startsWith('/matchup') || path.startsWith('/commissioner') || path.startsWith('/scoring')) return 'leagues';
    if (path.startsWith('/trends')) return 'trends';
    if (path.startsWith('/settings')) return 'settings';
    if (path.startsWith('/player')) return 'hub';
    if (path.startsWith('/login') || path.startsWith('/register')) return null;
    return 'home';
  };

  const activeTab = getActiveTab();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>PWHL Fantasy Hockey</h1>
        {!isPwhlAuthenticated && (
          <button
            style={styles.loginBtn}
            onClick={() => navigate('/login')}
            onMouseEnter={(e) => { e.target.style.background = 'var(--pink)'; e.target.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--pink)'; }}
          >
            Sign In
          </button>
        )}
      </div>

      <div style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isHovered = hoveredTab === tab.id;
          return (
            <button
              key={tab.id}
              style={{
                ...styles.tabButton,
                ...(isActive ? styles.tabButtonActive : {}),
                ...(isHovered && !isActive ? styles.tabButtonHover : {}),
              }}
              onClick={() => navigate(tab.path)}
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
            >
              <i className={tab.icon} style={{
                ...styles.tabIcon,
                color: isActive ? 'var(--pink)' : 'rgba(255,255,255,0.80)',
              }} />
              <span style={{
                ...styles.tabLabel,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.80)',
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      <div style={styles.content}>
        <Outlet />
      </div>

      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <span style={styles.footerText}>
            PdubFantasy is a product of{' '}
            <a href="https://unsupervisedbias.com" target="_blank" rel="noopener noreferrer" style={styles.footerLink}>
              UnsupervisedBias
            </a>
          </span>
          <span style={styles.footerDivider}>·</span>
          <span style={styles.footerText}>Not affiliated with the PWHL</span>
        </div>
      </footer>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    padding: '0 2rem',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem 0 0.5rem',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, var(--pink), var(--violet))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  loginBtn: {
    background: 'transparent',
    border: '1px solid var(--pink)',
    color: 'var(--pink)',
    padding: '8px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
  },
  tabBar: {
    display: 'flex',
    gap: '4px',
    padding: '0.75rem 0',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    marginBottom: '1.5rem',
    overflowX: 'auto',
  },
  tabButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },
  tabButtonActive: {
    background: 'rgba(255,124,222,0.1)',
  },
  tabButtonHover: {
    background: 'rgba(255,255,255,0.05)',
  },
  tabIcon: {
    fontSize: '1rem',
    transition: 'color 0.2s ease',
  },
  tabLabel: {
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'color 0.2s ease',
  },
  content: {
    paddingBottom: '3rem',
  },
  footer: {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    padding: '1.25rem 0',
    marginTop: '2rem',
  },
  footerInner: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.40)',
  },
  footerLink: {
    color: 'var(--pink)',
    textDecoration: 'none',
    fontWeight: '600',
  },
  footerDivider: {
    color: 'rgba(255,255,255,0.20)',
    fontSize: '0.8rem',
  },
};

export default PWHLLayout;
