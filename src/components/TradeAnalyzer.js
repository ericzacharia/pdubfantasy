import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PlayerAvatar from './PlayerAvatar';
import PlayerStatusBadge from './PlayerStatusBadge';
import { pwhlPlayersAPI } from '../services/pwhlAPI';

const COMPARE_STATS_SKATER = [
  { key: 'fantasy_value', label: 'Fantasy Pts', highlight: true },
  { key: 'goals',         label: 'Goals' },
  { key: 'assists',       label: 'Assists' },
  { key: 'points',        label: 'Points' },
  { key: 'shots',         label: 'SOG' },
  { key: 'plus_minus',    label: '+/-' },
  { key: 'games_played',  label: 'GP' },
];

const COMPARE_STATS_GOALIE = [
  { key: 'fantasy_value',        label: 'Fantasy Pts', highlight: true },
  { key: 'wins',                  label: 'Wins' },
  { key: 'save_percentage',       label: 'SV%',  decimals: 3 },
  { key: 'goals_against_average', label: 'GAA',  decimals: 2 },
  { key: 'shutouts',              label: 'Shutouts' },
  { key: 'games_played',          label: 'GP' },
];

const TradeAnalyzer = ({ onClose }) => {
  const navigate = useNavigate();
  const [search1, setSearch1] = useState('');
  const [search2, setSearch2] = useState('');
  const [results1, setResults1] = useState([]);
  const [results2, setResults2] = useState([]);
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);

  const searchPlayers = async (q, setResults) => {
    if (!q || q.length < 1) { setResults([]); return; }
    try {
      const res = await pwhlPlayersAPI.getPlayers({ q, page_size: 8, season: '2025-2026' });
      setResults(res.data?.players || []);
    } catch {}
  };

  useEffect(() => {
    const t = setTimeout(() => searchPlayers(search1, setResults1), 300);
    return () => clearTimeout(t);
  }, [search1]);

  useEffect(() => {
    const t = setTimeout(() => searchPlayers(search2, setResults2), 300);
    return () => clearTimeout(t);
  }, [search2]);

  const getStatVal = (player, statKey) => {
    const stats = player?.season_stats || {};
    const val = statKey === 'fantasy_value' ? player?.fantasy_value : stats[statKey];
    return val ?? null;
  };

  const formatVal = (val, decimals) => {
    if (val == null) return '—';
    if (decimals) return Number(val).toFixed(decimals);
    return val;
  };

  const isGoalie1 = player1?.position === 'G';
  const isGoalie2 = player2?.position === 'G';
  const bothGoalies = isGoalie1 && isGoalie2;
  const bothSkaters = !isGoalie1 && !isGoalie2;
  const compareStats = bothGoalies ? COMPARE_STATS_GOALIE : COMPARE_STATS_SKATER;

  const getWinner = (stat, p1, p2) => {
    const v1 = getStatVal(p1, stat.key);
    const v2 = getStatVal(p2, stat.key);
    if (v1 == null || v2 == null) return null;
    const n1 = Number(v1);
    const n2 = Number(v2);
    if (n1 === n2) return null;
    // GAA: lower is better
    if (stat.key === 'goals_against_average') return n1 < n2 ? 'a' : 'b';
    return n1 > n2 ? 'a' : 'b';
  };

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>
            <i className="fas fa-balance-scale" style={{ marginRight: '8px', color: 'var(--pink)' }} />
            Compare Players
          </h3>
          <button onClick={onClose} style={styles.closeBtn}><i className="fas fa-times" /></button>
        </div>

        <div style={styles.cols}>
          {/* Player 1 */}
          <div style={styles.col}>
            <PlayerSearch
              label="Player A"
              search={search1}
              setSearch={setSearch1}
              results={results1}
              selected={player1}
              onSelect={p => { setPlayer1(p); setSearch1(''); setResults1([]); }}
              onClear={() => setPlayer1(null)}
              navigate={navigate}
            />
          </div>

          <div style={styles.vsCol}>VS</div>

          {/* Player 2 */}
          <div style={styles.col}>
            <PlayerSearch
              label="Player B"
              search={search2}
              setSearch={setSearch2}
              results={results2}
              selected={player2}
              onSelect={p => { setPlayer2(p); setSearch2(''); setResults2([]); }}
              onClear={() => setPlayer2(null)}
              navigate={navigate}
            />
          </div>
        </div>

        {/* Comparison table */}
        {(player1 || player2) && (
          <div style={styles.compareTable}>
            {compareStats.map(stat => {
              const winner = player1 && player2 ? getWinner(stat, player1, player2) : null;
              const v1 = getStatVal(player1, stat.key);
              const v2 = getStatVal(player2, stat.key);
              return (
                <div key={stat.key} style={styles.statRow}>
                  <div style={{ ...styles.statVal, textAlign: 'right', color: winner === 'a' ? 'var(--pink)' : '#fff', fontWeight: winner === 'a' ? '700' : '400' }}>
                    {formatVal(v1, stat.decimals)}
                    {winner === 'a' && <i className="fas fa-caret-left" style={{ marginLeft: '5px', color: 'var(--pink)' }} />}
                  </div>
                  <div style={styles.statLabel}>{stat.label}</div>
                  <div style={{ ...styles.statVal, textAlign: 'left', color: winner === 'b' ? 'var(--pink)' : '#fff', fontWeight: winner === 'b' ? '700' : '400' }}>
                    {winner === 'b' && <i className="fas fa-caret-right" style={{ marginRight: '5px', color: 'var(--pink)' }} />}
                    {formatVal(v2, stat.decimals)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {player1 && player2 && !bothSkaters && !bothGoalies && (
          <div style={styles.mixedNote}>
            <i className="fas fa-info-circle" style={{ marginRight: '6px' }} />
            Comparing skater vs goalie — some stats may not apply.
          </div>
        )}
      </div>
    </div>
  );
};

const PlayerSearch = ({ label, search, setSearch, results, selected, onSelect, onClear, navigate }) => (
  <div>
    <div style={styles.colLabel}>{label}</div>
    {selected ? (
      <div style={styles.selectedCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <PlayerAvatar src={selected.headshot_url} name={`${selected.first_name} ${selected.last_name}`} position={selected.position} size={44} />
          <div>
            <div
              style={{ fontWeight: '700', color: '#fff', cursor: 'pointer' }}
              onClick={() => navigate(`/player/${selected.slug || selected.id}`)}
            >
              {selected.first_name} {selected.last_name}
              <PlayerStatusBadge status={selected.status} note={selected.status_note} />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)' }}>
              {selected.position} · {selected.team_abbreviation}
            </div>
          </div>
        </div>
        <button style={styles.clearBtn} onClick={onClear}>Change</button>
      </div>
    ) : (
      <div style={{ position: 'relative' }}>
        <i className="fas fa-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }} />
        <input
          type="text"
          placeholder="Search player..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
          autoFocus
        />
        {results.length > 0 && (
          <div style={styles.dropdown}>
            {results.map(p => (
              <div key={p.id} style={styles.dropdownItem} onClick={() => onSelect(p)}>
                <PlayerAvatar src={p.headshot_url} name={`${p.first_name} ${p.last_name}`} position={p.position} size={28} />
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#fff', fontWeight: '500' }}>
                    {p.first_name} {p.last_name}
                    <PlayerStatusBadge status={p.status} note={p.status_note} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                    {p.position} · {p.team_abbreviation} · {(p.fantasy_value || 0).toFixed(1)} FP
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
);

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modal: { background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '780px', minHeight: '60vh', maxHeight: '92vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  modalTitle: { margin: 0, color: '#fff', fontSize: '1.1rem', display: 'flex', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1rem' },
  cols: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'start', marginBottom: '1.5rem' },
  col: {},
  vsCol: { fontWeight: '800', color: 'rgba(255,255,255,0.2)', fontSize: '1rem', paddingTop: '30px', textAlign: 'center' },
  colLabel: { fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' },
  selectedCard: { background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', padding: '12px' },
  clearBtn: { background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.6)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' },
  searchInput: { width: '100%', padding: '9px 12px 9px 30px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a0a2e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', marginTop: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' },
  compareTable: { background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' },
  statRow: { display: 'grid', gridTemplateColumns: '1fr 120px 1fr', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  statVal: { fontSize: '1rem', display: 'flex', alignItems: 'center' },
  statLabel: { textAlign: 'center', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.45)' },
  mixedNote: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: '12px' },
};

export default TradeAnalyzer;
