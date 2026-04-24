import axios from 'axios';

const PWHL_BASE_URL = 'https://pwhl.unsupervisedbias.com/api/v1';

// Create dedicated axios instance for PWHL backend
const pwhlApi = axios.create({
  baseURL: PWHL_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper functions for PWHL-specific token storage
const getPwhlToken = (key) => {
  return localStorage.getItem(key) || sessionStorage.getItem(key);
};

const setPwhlToken = (key, value) => {
  if (localStorage.getItem(key) !== null) {
    localStorage.setItem(key, value);
  } else {
    sessionStorage.setItem(key, value);
  }
};

export const clearPwhlTokens = () => {
  localStorage.removeItem('pwhlAccessToken');
  localStorage.removeItem('pwhlRefreshToken');
  sessionStorage.removeItem('pwhlAccessToken');
  sessionStorage.removeItem('pwhlRefreshToken');
};

// Request interceptor - attach PWHL access token
pwhlApi.interceptors.request.use(
  (config) => {
    const token = getPwhlToken('pwhlAccessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 with token refresh
pwhlApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = getPwhlToken('pwhlRefreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${PWHL_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data;
        setPwhlToken('pwhlAccessToken', access_token);
        if (refresh_token) {
          setPwhlToken('pwhlRefreshToken', refresh_token);
        }

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return pwhlApi(originalRequest);
      } catch (refreshError) {
        clearPwhlTokens();
        window.location.href = '/pwhl/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ── Auth ──
export const pwhlAuthAPI = {
  login: (email, password) =>
    pwhlApi.post('/auth/login', { email, password }),
  register: (email, username, password) =>
    pwhlApi.post('/auth/register', { email, username, password }),
  refresh: (refresh_token) =>
    pwhlApi.post('/auth/refresh', { refresh_token }),
  getMe: () =>
    pwhlApi.get('/auth/me'),
  changePassword: (current_password, new_password) =>
    pwhlApi.post('/auth/change-password', { current_password, new_password }),
};

// ── Players ──
export const pwhlPlayersAPI = {
  getPlayers: (params = {}) =>
    pwhlApi.get('/players', { params }),
  getPlayer: (id) =>
    pwhlApi.get(`/players/${id}`),
  getPlayerStats: (id) =>
    pwhlApi.get(`/players/${id}/stats`),
  getPlayerNews: (id) =>
    pwhlApi.get(`/players/${id}/news`),
  getSeasons: () =>
    pwhlApi.get('/players/seasons'),
  getAllTeams: () =>
    pwhlApi.get('/players/teams/all'),
};

// ── PWHL League Data (standings, games, news) ──
export const pwhlLeagueAPI = {
  getStandings: (params = {}) =>
    pwhlApi.get('/pwhl/standings', { params }),
  getStandingSeasons: () =>
    pwhlApi.get('/pwhl/standings/seasons'),
  getTeamRoster: (teamId) =>
    pwhlApi.get(`/pwhl/teams/${teamId}/roster`),
  getGames: (params = {}) =>
    pwhlApi.get('/games', { params }),
  getUpcomingGames: (days = 180) =>
    pwhlApi.get('/pwhl/games/upcoming', { params: { days } }),
  getArticles: (params = {}) =>
    pwhlApi.get('/pwhl/articles', { params }),
  getNews: () =>
    pwhlApi.get('/pwhl/news'),
};

// ── Fantasy Leagues ──
export const pwhlFantasyAPI = {
  // Leagues
  getMyLeagues: () =>
    pwhlApi.get('/leagues'),
  getPublicLeagues: (params = {}) =>
    pwhlApi.get('/leagues/public', { params }),
  getLeague: (id) =>
    pwhlApi.get(`/leagues/${id}`),
  createLeague: (data) =>
    pwhlApi.post('/leagues', data),
  joinLeague: (invite_code) =>
    pwhlApi.post('/leagues/join', { invite_code }),
  updateLeagueSettings: (id, data) =>
    pwhlApi.patch(`/leagues/${id}/settings`, data),
  getScoringSettings: (id) =>
    pwhlApi.get(`/leagues/${id}/scoring`),
  updateScoringSettings: (id, data) =>
    pwhlApi.put(`/leagues/${id}/scoring`, data),
  updatePaymentSettings: (id, data) =>
    pwhlApi.put(`/leagues/${id}/payment`, null, { params: data }),
  confirmPayment: (id) =>
    pwhlApi.post(`/leagues/${id}/members/confirm-payment`),
  getLeagueMembers: (id) =>
    pwhlApi.get(`/leagues/${id}/members`),

  // Fantasy Teams
  getMyTeams: () =>
    pwhlApi.get('/fantasy/my-teams'),
  getLeagueTeams: (leagueId) =>
    pwhlApi.get(`/leagues/${leagueId}/teams`),
  createTeam: (leagueId, name) =>
    pwhlApi.post(`/leagues/${leagueId}/teams`, { name }),
  getLeagueStandings: (leagueId) =>
    pwhlApi.get(`/fantasy/leagues/${leagueId}/standings`),

  // Roster & Lineup
  getTeamRoster: (teamId) =>
    pwhlApi.get(`/fantasy/teams/${teamId}/roster`),
  getLineup: (teamId) =>
    pwhlApi.get(`/fantasy/teams/${teamId}/lineup`),
  setLineup: (teamId, slots) =>
    pwhlApi.post(`/fantasy/teams/${teamId}/lineup`, { slots }),
  getLineupStatus: (teamId) =>
    pwhlApi.get(`/fantasy/teams/${teamId}/lineup/status`),

  // Draft
  getDraftState: (leagueId) =>
    pwhlApi.get(`/leagues/${leagueId}/draft`),
  startDraft: (leagueId) =>
    pwhlApi.post(`/leagues/${leagueId}/draft/start`),

  // Admin CPU draft simulation
  cpuPick: (leagueId, sigma = 8) =>
    pwhlApi.post(`/leagues/${leagueId}/draft/cpu-pick?sigma=${sigma}`),
  cpuPicksUntilMine: (leagueId, sigma = 8) =>
    pwhlApi.post(`/leagues/${leagueId}/draft/cpu-picks-until-mine?sigma=${sigma}`),
  cpuComplete: (leagueId, sigma = 8) =>
    pwhlApi.post(`/leagues/${leagueId}/draft/cpu-complete?sigma=${sigma}`),
  cpuPickForMe: (leagueId, sigma = 4) =>
    pwhlApi.post(`/leagues/${leagueId}/draft/cpu-pick-for-me?sigma=${sigma}`),
  makeDraftPick: (leagueId, player_id) =>
    pwhlApi.post(`/leagues/${leagueId}/draft/pick`, { player_id }),
  getAvailablePlayers: (leagueId, params = {}) =>
    pwhlApi.get(`/fantasy/players/available/${leagueId}`, { params }),

  // Waivers
  getWaiverPlayers: (leagueId, params = {}) =>
    pwhlApi.get(`/fantasy/leagues/${leagueId}/waivers`, { params }),
  claimWaiver: (data) =>
    pwhlApi.post('/waivers/claim', data),
  submitFaabBid: (leagueId, data) =>
    pwhlApi.post(`/leagues/${leagueId}/waivers/bids`, data),
  getMyBids: (leagueId) =>
    pwhlApi.get(`/leagues/${leagueId}/waivers/bids`),
  cancelBid: (bidId) =>
    pwhlApi.delete(`/fantasy/waivers/bids/${bidId}`),

  // Trades
  getMyTrades: () =>
    pwhlApi.get('/fantasy/trades'),
  proposeTrade: (leagueId, data) =>
    pwhlApi.post(`/fantasy/leagues/${leagueId}/trades`, data),
  respondToTrade: (tradeId, accept) =>
    pwhlApi.post(`/fantasy/trades/${tradeId}/respond`, { accept }),
  vetoTrade: (tradeId) =>
    pwhlApi.post(`/fantasy/trades/${tradeId}/veto`),

  // Scoring breakdown
  getWeeklyScoring: (teamId, week = null) =>
    pwhlApi.get(`/fantasy/teams/${teamId}/scoring/week${week ? `?week=${week}` : ''}`),

  // Matchups
  getCurrentMatchup: (leagueId) =>
    pwhlApi.get(`/fantasy/leagues/${leagueId}/matchups/current`),
  getMatchupByWeek: (leagueId, week) =>
    pwhlApi.get(`/fantasy/leagues/${leagueId}/matchups/${week}`),
  getAllMatchups: (leagueId) =>
    pwhlApi.get(`/fantasy/leagues/${leagueId}/matchups`),
  generateSchedule: (leagueId) =>
    pwhlApi.post(`/fantasy/leagues/${leagueId}/matchups/generate`),
};

// ── Trends ──
export const pwhlTrendsAPI = {
  getTrends: (params = {}) =>
    pwhlApi.get('/trends', { params: { limit: 100, ...params } }),
};

export default pwhlApi;
