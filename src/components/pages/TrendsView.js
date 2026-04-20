import React, { useState, useEffect } from 'react';
import { pwhlTrendsAPI } from '../../services/pwhlAPI';

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
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastN, setLastN] = useState(10);
  const [activeCategory, setActiveCategory] = useState('All');
  const [lastUpdated, setLastUpdated] = useState(null);

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

  const categories = ['All', ...new Set(trends.map(t => t.category).filter(Boolean))];
  const filtered = activeCategory === 'All'
    ? trends
    : trends.filter(t => t.category === activeCategory);

  return (
    <div>
      {/* Controls */}
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

      {/* Category chips */}
      <div className="pwhl-filter-chips" style={{ marginBottom: '1.5rem' }}>
        {categories.map(cat => (
          <button
            key={cat}
            className={`pwhl-chip ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >{cat}</button>
        ))}
      </div>

      {loading ? (
        <div style={styles.loading}>Loading trends...</div>
      ) : filtered.length === 0 ? (
        <div style={styles.loading}>No trends available</div>
      ) : (
        <div style={styles.grid}>
          {filtered.map(trend => <TrendCard key={trend.id} trend={trend} />)}
        </div>
      )}
    </div>
  );
};

const TrendCard = ({ trend }) => {
  const [hovered, setHovered] = useState(false);
  const sev = SEVERITY_STYLES[trend.severity] || SEVERITY_STYLES.info;

  return (
    <div
      style={{
        ...styles.card,
        background: hovered ? sev.bg : 'rgba(255,255,255,0.04)',
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
            <span style={styles.tag}>
              <i className="fas fa-shield-alt" style={{ marginRight: '4px', fontSize: '0.7rem' }} />{trend.team}
            </span>
          )}
          {trend.player && (
            <span style={styles.tag}>
              <i className="fas fa-user" style={{ marginRight: '4px', fontSize: '0.7rem' }} />{trend.player}
            </span>
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
  tagRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  tag: { display: 'flex', alignItems: 'center', padding: '3px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: '20px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.80)' },
};

export default TrendsView;
