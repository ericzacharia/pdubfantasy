import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePwhlAuth } from '../../contexts/PwhlAuthContext';
import { pwhlFantasyAPI } from '../../services/pwhlAPI';

const POS_COLORS = { F: '#8b5cf6', C: '#8b5cf6', LW: '#8b5cf6', RW: '#8b5cf6', D: '#3b82f6', G: '#f59e0b', UTIL: '#6366f1', BN: 'rgba(255,255,255,0.2)', IR: '#ef4444' };

const SLOT_LABELS = {
  F_0: 'F', F_1: 'F', F_2: 'F', F_3: 'F',
  D_0: 'D', D_1: 'D', D_2: 'D',
  G_0: 'G', G_1: 'G',
  UTIL_0: 'UTIL',
  BN_0: 'BN', BN_1: 'BN', BN_2: 'BN', BN_3: 'BN', BN_4: 'BN',
  IR_0: 'IR', IR_1: 'IR',
};

const MyTeamView = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { isPwhlAuthenticated } = usePwhlAuth();
  const [activeTab, setActiveTab] = useState('roster');
  const [roster, setRoster] = useState([]);
  const [lineup, setLineup] = useState(null);
  const [lineupStatus, setLineupStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slotAssignments, setSlotAssignments] = useState({});
  const [message, setMessage] = useState(null);
  const [playerType, setPlayerType] = useState('skaters');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rosterRes, lineupRes, statusRes] = await Promise.all([
        pwhlFantasyAPI.getTeamRoster(teamId),
        pwhlFantasyAPI.getLineup(teamId).catch(() => ({ data: null })),
        pwhlFantasyAPI.getLineupStatus(teamId).catch(() => ({ data: null })),
      ]);
      setRoster(rosterRes.data || []);
      setLineup(lineupRes.data);
      setLineupStatus(statusRes.data);

      // Build initial slot assignments from lineup
      if (lineupRes.data?.slots) {
        const assignments = {};
        lineupRes.data.slots.forEach(slot => {
          if (slot.player) assignments[slot.slot_label] = slot.player.id;
        });
        setSlotAssignments(assignments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (isPwhlAuthenticated) fetchData();
  }, [isPwhlAuthenticated, fetchData]);

  const saveLineup = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await pwhlFantasyAPI.setLineup(teamId, slotAssignments);
      setMessage({ type: 'success', text: 'Lineup saved!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to save lineup' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const autoAssign = () => {
    const skaters = roster.filter(p => p.position !== 'G' && p.slot !== 'ir');
    const goalies = roster.filter(p => p.position === 'G' && p.slot !== 'ir');
    const assignments = {};

    // Assign forwards
    let fIdx = 0;
    skaters.filter(p => ['C','LW','RW'].includes(p.position)).forEach(p => {
      if (fIdx < 3) { assignments[`F_${fIdx}`] = p.player_id; fIdx++; }
    });
    // Assign defensemen
    let dIdx = 0;
    skaters.filter(p => p.position === 'D').forEach(p => {
      if (dIdx < 2) { assignments[`D_${dIdx}`] = p.player_id; dIdx++; }
    });
    // Assign goalies
    if (goalies.length > 0) assignments['G_0'] = goalies[0].player_id;
    // Fill UTIL with any remaining skater
    const usedIds = new Set(Object.values(assignments));
    const utilPlayer = skaters.find(p => !usedIds.has(p.player_id));
    if (utilPlayer) assignments['UTIL_0'] = utilPlayer.player_id;
    // Rest to bench
    let bnIdx = 0;
    roster.filter(p => p.slot !== 'ir' && !Object.values(assignments).includes(p.player_id)).forEach(p => {
      if (bnIdx < 5) { assignments[`BN_${bnIdx}`] = p.player_id; bnIdx++; }
    });
    setSlotAssignments(assignments);
  };

  if (!isPwhlAuthenticated) return <div style={styles.center}>Sign in to manage your team.</div>;
  if (loading) return <div style={styles.center}>Loading team...</div>;

  const isLocked = lineupStatus?.locked;
  const skaters = roster.filter(p => p.position !== 'G');
  const goalies = roster.filter(p => p.position === 'G');
  const displayRoster = playerType === 'skaters' ? skaters : goalies;

  return (
    <div>
      {/* Back */}
      <button style={styles.backBtn} onClick={() => navigate(-1)}>
        <i className="fas fa-chevron-left" style={{ marginRight: '6px' }} />Back
      </button>

      {/* Sub-tabs */}
      <div style={styles.subTabBar}>
        {[['roster', 'Roster'], ['lineup', 'Lineup']].map(([id, label]) => (
          <button
            key={id}
            style={{ ...styles.subTab, ...(activeTab === id ? styles.subTabActive : {}) }}
            onClick={() => setActiveTab(id)}
          >{label}</button>
        ))}
        <button
          style={{ ...styles.subTab, marginLeft: 'auto' }}
          onClick={() => navigate(`/scoring/${teamId}`)}
        >
          <i className="fas fa-chart-bar" style={{ marginRight: '6px', fontSize: '0.8rem' }} />Scoring
        </button>
      </div>

      {activeTab === 'roster' && (
        <div>
          <div style={styles.typeToggle}>
            {[['skaters', 'Skaters'], ['goalies', 'Goalies']].map(([t, label]) => (
              <button
                key={t}
                style={{ ...styles.toggleBtn, ...(playerType === t ? styles.toggleBtnActive : {}) }}
                onClick={() => setPlayerType(t)}
              >{label}</button>
            ))}
          </div>
          <div style={styles.tableCard}>
            <div className="pwhl-table-scroll">
              <div style={{ minWidth: '500px' }}>
                <div style={styles.tableHeader}>
                  {(playerType === 'skaters'
                    ? ['Player', 'POS', 'Team', 'GP', 'G', 'A', 'PTS', 'SOG', 'FP', 'Slot']
                    : ['Player', 'POS', 'Team', 'GP', 'W', 'SV%', 'GAA', 'SO', 'FP', 'Slot']
                  ).map((col, i) => (
                    <div key={i} style={{ ...styles.th, width: ROSTER_WIDTHS[i], minWidth: ROSTER_WIDTHS[i], textAlign: i === 0 ? 'left' : 'center', color: col === 'FP' ? 'var(--pink)' : 'rgba(255,255,255,0.80)' }}>
                      {col}
                    </div>
                  ))}
                </div>
                {displayRoster.length === 0 ? (
                  <div style={styles.emptyRow}>No {playerType} on roster</div>
                ) : (
                  displayRoster.map((player, idx) => (
                    <RosterRow key={player.roster_id || idx} player={player} isSkatersView={playerType === 'skaters'} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'lineup' && (
        <div>
          {/* Lock status / auto-assign */}
          <div style={styles.lineupBar}>
            {isLocked ? (
              <div style={styles.lockedBadge}>
                <i className="fas fa-lock" style={{ marginRight: '6px' }} />
                Lineup locked{lineupStatus?.lock_time ? ` at ${new Date(lineupStatus.lock_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.80)' }}>
                <i className="fas fa-unlock" style={{ marginRight: '6px' }} />
                Lineup unlocked — set your active players
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              {!isLocked && (
                <button style={styles.secondaryBtn} onClick={autoAssign}>
                  <i className="fas fa-magic" style={{ marginRight: '6px' }} />Auto-Fill
                </button>
              )}
              {!isLocked && (
                <button style={{ ...styles.primaryBtn, opacity: saving ? 0.6 : 1 }} onClick={saveLineup} disabled={saving}>
                  <i className="fas fa-save" style={{ marginRight: '6px' }} />{saving ? 'Saving...' : 'Save Lineup'}
                </button>
              )}
            </div>
          </div>

          {message && (
            <div style={{ ...styles.msgBanner, background: message.type === 'success' ? 'rgba(0,200,83,0.15)' : 'rgba(255,82,82,0.15)', borderColor: message.type === 'success' ? 'rgba(0,200,83,0.3)' : 'rgba(255,82,82,0.3)', color: message.type === 'success' ? '#00c853' : '#ff5252' }}>
              {message.text}
            </div>
          )}

          {/* Slot groups */}
          {[
            { title: 'Active Lineup', slots: ['F_0','F_1','F_2','D_0','D_1','G_0','UTIL_0'] },
            { title: 'Bench', slots: ['BN_0','BN_1','BN_2','BN_3','BN_4'] },
            { title: 'Injured Reserve', slots: ['IR_0','IR_1'] },
          ].map(group => {
            const relevantSlots = group.slots.filter(s => lineup?.slots?.some(ls => ls.slot_label === s) || slotAssignments[s]);
            if (relevantSlots.length === 0 && group.title !== 'Active Lineup') return null;
            return (
              <div key={group.title} style={{ marginBottom: '1.5rem' }}>
                <div style={styles.slotGroupTitle}>{group.title}</div>
                {(group.title === 'Active Lineup' ? group.slots : relevantSlots).map(slotKey => {
                  const slotData = lineup?.slots?.find(s => s.slot_label === slotKey);
                  const assignedPlayerId = slotAssignments[slotKey];
                  const assignedPlayer = roster.find(p => p.player_id === assignedPlayerId);
                  const posLabel = SLOT_LABELS[slotKey] || slotKey;
                  const posColor = POS_COLORS[posLabel] || POS_COLORS.BN;

                  return (
                    <div key={slotKey} style={styles.slotRow}>
                      <div style={{ ...styles.posBadge, background: posColor + '33', color: posColor, borderColor: posColor + '66' }}>
                        {posLabel}
                      </div>
                      <div style={styles.slotContent}>
                        {assignedPlayer ? (
                          <div style={styles.playerInSlot}>
                            {assignedPlayer.headshot_url && (
                              <img src={assignedPlayer.headshot_url} alt="" style={styles.headshot} onError={e => { e.target.style.display = 'none'; }} />
                            )}
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fff' }}>{assignedPlayer.player_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}>
                                {assignedPlayer.position} · {assignedPlayer.team_abbreviation}
                              </div>
                            </div>
                            <div style={{ marginLeft: 'auto', color: 'var(--pink)', fontWeight: '700', fontSize: '0.875rem' }}>
                              {(assignedPlayer.fantasy_points || 0).toFixed(1)} FP
                            </div>
                          </div>
                        ) : (
                          <div style={styles.emptySlot}>
                            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>Empty — assign a player</span>
                          </div>
                        )}
                      </div>
                      {!isLocked && assignedPlayer && (
                        <button
                          style={styles.removeBtn}
                          onClick={() => {
                            const next = { ...slotAssignments };
                            delete next[slotKey];
                            setSlotAssignments(next);
                          }}
                        >
                          <i className="fas fa-times" />
                        </button>
                      )}
                      {!isLocked && !assignedPlayer && (
                        <PlayerPickerInline
                          slotKey={slotKey}
                          posLabel={posLabel}
                          roster={roster}
                          usedIds={new Set(Object.values(slotAssignments))}
                          onPick={playerId => setSlotAssignments(prev => ({ ...prev, [slotKey]: playerId }))}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ROSTER_WIDTHS = ['160px', '50px', '55px', '45px', '45px', '45px', '50px', '50px', '60px', '60px'];

const RosterRow = ({ player, isSkatersView }) => {
  const [hovered, setHovered] = useState(false);
  const stats = player;
  return (
    <div
      style={{ ...styles.tableRow, background: hovered ? 'rgba(255,255,255,0.05)' : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ ...styles.td, width: ROSTER_WIDTHS[0], minWidth: ROSTER_WIDTHS[0], display: 'flex', alignItems: 'center', gap: '8px' }}>
        {player.headshot_url && <img src={player.headshot_url} alt="" style={styles.headshot} onError={e => { e.target.style.display = 'none'; }} />}
        <span style={{ fontWeight: '600', color: '#fff' }}>{player.player_name}</span>
      </div>
      <div style={{ ...styles.td, width: ROSTER_WIDTHS[1], minWidth: ROSTER_WIDTHS[1], textAlign: 'center' }}>{player.position}</div>
      <div style={{ ...styles.td, width: ROSTER_WIDTHS[2], minWidth: ROSTER_WIDTHS[2], textAlign: 'center', color: 'rgba(255,255,255,0.80)' }}>{player.team_abbreviation}</div>
      <div style={{ ...styles.td, width: ROSTER_WIDTHS[3], minWidth: ROSTER_WIDTHS[3], textAlign: 'center' }}>{stats.games_played || 0}</div>
      {isSkatersView ? (<>
        <div style={{ ...styles.td, width: ROSTER_WIDTHS[4], minWidth: ROSTER_WIDTHS[4], textAlign: 'center' }}>{stats.goals || 0}</div>
        <div style={{ ...styles.td, width: ROSTER_WIDTHS[5], minWidth: ROSTER_WIDTHS[5], textAlign: 'center' }}>{stats.assists || 0}</div>
        <div style={{ ...styles.td, width: ROSTER_WIDTHS[6], minWidth: ROSTER_WIDTHS[6], textAlign: 'center' }}>{(stats.goals||0)+(stats.assists||0)}</div>
        <div style={{ ...styles.td, width: ROSTER_WIDTHS[7], minWidth: ROSTER_WIDTHS[7], textAlign: 'center' }}>{stats.shots || 0}</div>
      </>) : (<>
        <div style={{ ...styles.td, width: ROSTER_WIDTHS[4], minWidth: ROSTER_WIDTHS[4], textAlign: 'center' }}>{stats.wins || 0}</div>
        <div style={{ ...styles.td, width: ROSTER_WIDTHS[5], minWidth: ROSTER_WIDTHS[5], textAlign: 'center' }}>—</div>
        <div style={{ ...styles.td, width: ROSTER_WIDTHS[6], minWidth: ROSTER_WIDTHS[6], textAlign: 'center' }}>—</div>
        <div style={{ ...styles.td, width: ROSTER_WIDTHS[7], minWidth: ROSTER_WIDTHS[7], textAlign: 'center' }}>—</div>
      </>)}
      <div style={{ ...styles.td, width: ROSTER_WIDTHS[8], minWidth: ROSTER_WIDTHS[8], textAlign: 'center', color: 'var(--pink)', fontWeight: '700' }}>
        {(stats.fantasy_points || 0).toFixed(1)}
      </div>
      <div style={{ ...styles.td, width: ROSTER_WIDTHS[9], minWidth: ROSTER_WIDTHS[9], textAlign: 'center', color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem' }}>
        {stats.slot ? stats.slot.toUpperCase() : '—'}
      </div>
    </div>
  );
};

const PlayerPickerInline = ({ slotKey, posLabel, roster, usedIds, onPick }) => {
  const [open, setOpen] = useState(false);

  const eligible = roster.filter(p => {
    if (usedIds.has(p.player_id)) return false;
    if (posLabel === 'G') return p.position === 'G';
    if (posLabel === 'D') return p.position === 'D';
    if (posLabel === 'F') return ['C','LW','RW'].includes(p.position);
    if (posLabel === 'UTIL') return p.position !== 'G';
    if (posLabel === 'BN') return true;
    return true;
  });

  if (!open) {
    return (
      <button style={styles.assignBtn} onClick={() => setOpen(true)}>
        <i className="fas fa-plus" style={{ marginRight: '5px', fontSize: '0.75rem' }} />Assign
      </button>
    );
  }

  return (
    <div style={styles.pickerDropdown}>
      <button style={styles.pickerClose} onClick={() => setOpen(false)}><i className="fas fa-times" /></button>
      {eligible.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', padding: '8px' }}>No eligible players</div>
      ) : (
        eligible.map(p => (
          <button key={p.player_id} style={styles.pickerOption} onClick={() => { onPick(p.player_id); setOpen(false); }}>
            <span style={{ fontWeight: '600' }}>{p.player_name}</span>
            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem', marginLeft: '8px' }}>{p.position} · {p.team_abbreviation} · {(p.fantasy_points||0).toFixed(1)} FP</span>
          </button>
        ))
      )}
    </div>
  );
};

const styles = {
  center: { textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.80)' },
  backBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.80)', cursor: 'pointer', fontSize: '0.875rem', padding: '0 0 1rem', display: 'flex', alignItems: 'center' },
  subTabBar: { display: 'flex', gap: '8px', marginBottom: '1.5rem' },
  subTab: { padding: '8px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  subTabActive: { background: 'rgba(255,124,222,0.15)', borderColor: 'rgba(255,124,222,0.4)', color: 'var(--pink)' },
  typeToggle: { display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '3px', marginBottom: '12px', width: 'fit-content' },
  toggleBtn: { padding: '6px 18px', background: 'transparent', border: 'none', borderRadius: '6px', color: 'rgba(255,255,255,0.80)', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  toggleBtnActive: { background: 'rgba(255,124,222,0.2)', color: 'var(--pink)' },
  tableCard: { background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' },
  tableHeader: { display: 'flex', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' },
  th: { fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '0 4px' },
  tableRow: { display: 'flex', padding: '9px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', transition: 'background 0.15s' },
  td: { fontSize: '0.875rem', padding: '0 4px', color: 'rgba(255,255,255,0.92)' },
  headshot: { width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  emptyRow: { padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem' },
  lineupBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', gap: '12px', flexWrap: 'wrap' },
  lockedBadge: { display: 'flex', alignItems: 'center', color: '#ffc107', fontSize: '0.875rem', fontWeight: '600' },
  msgBanner: { padding: '10px 16px', borderRadius: '8px', border: '1px solid', marginBottom: '12px', fontSize: '0.875rem' },
  slotGroupTitle: { fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)', marginBottom: '8px' },
  slotRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '6px', border: '1px solid rgba(255,255,255,0.06)', position: 'relative' },
  posBadge: { width: '44px', height: '28px', borderRadius: '6px', border: '1px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '700', flexShrink: 0, letterSpacing: '0.04em' },
  slotContent: { flex: 1 },
  playerInSlot: { display: 'flex', alignItems: 'center', gap: '10px' },
  emptySlot: { display: 'flex', alignItems: 'center' },
  removeBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.50)', cursor: 'pointer', fontSize: '0.8rem', padding: '4px', transition: 'color 0.2s', flexShrink: 0 },
  assignBtn: { background: 'rgba(255,124,222,0.1)', border: '1px solid rgba(255,124,222,0.25)', color: 'var(--pink)', borderRadius: '6px', padding: '5px 10px', fontSize: '0.78rem', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' },
  pickerDropdown: { position: 'absolute', right: '0', top: '100%', background: '#1a0b2e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', zIndex: 100, minWidth: '260px', maxHeight: '220px', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', padding: '6px' },
  pickerClose: { position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontSize: '0.8rem' },
  pickerOption: { display: 'block', width: '100%', padding: '8px 10px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', fontSize: '0.875rem', transition: 'background 0.15s' },
  primaryBtn: { background: 'linear-gradient(135deg, var(--pink), var(--violet))', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  secondaryBtn: { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.15)', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center' },
};

export default MyTeamView;
