import api from './api';

/**
 * Trading API Service
 * Handles all API calls to the trading backend endpoints
 */

export const tradingAPI = {
  // Account
  getAccount: () => api.get('/trading/account/current/'),
  updateAccount: (data) => api.put('/trading/account/current/', data),

  // Dashboard
  getDashboard: () => api.get('/trading/dashboard/'),

  // Positions
  getPositions: (params) => api.get('/trading/positions/', { params }),
  getPositionsSummary: () => api.get('/trading/positions/summary/'),
  getPosition: (id) => api.get(`/trading/positions/${id}/`),

  // Orders
  getOrders: (params) => api.get('/trading/orders/', { params }),
  getPendingOrders: () => api.get('/trading/orders/pending/'),
  getRecentOrders: () => api.get('/trading/orders/recent/'),
  getOrder: (id) => api.get(`/trading/orders/${id}/`),

  // Trades
  getTrades: (params) => api.get('/trading/trades/', { params }),
  getClosedTrades: () => api.get('/trading/trades/closed/'),
  getTradeStatistics: () => api.get('/trading/trades/statistics/'),
  getTrade: (id) => api.get(`/trading/trades/${id}/`),

  // Screening
  getScreeningResults: (params) => api.get('/trading/screening/', { params }),
  getLatestScreening: () => api.get('/trading/screening/latest/'),

  // Performance
  getPerformanceSnapshots: (params) => api.get('/trading/performance/', { params }),
  getPerformanceChartData: (days = 90) =>
    api.get('/trading/performance/chart_data/', { params: { days } }),
  getSpyOhlc: (days = 90) =>
    api.get('/trading/performance/spy_ohlc/', { params: { days } }),

  // Alerts
  getAlerts: (params) => api.get('/trading/alerts/', { params }),
  getUnreadAlerts: () => api.get('/trading/alerts/unread/'),
  markAlertRead: (id) => api.post(`/trading/alerts/${id}/mark_read/`),
  dismissAlert: (id) => api.post(`/trading/alerts/${id}/dismiss/`),

  // System Logs
  getLogs: (params) => api.get('/trading/logs/', { params }),

  // Watchlist
  getWatchlist:       ()       => api.get('/trading/watchlist/'),
  getWatchlistPrices: ()       => api.get('/trading/watchlist/prices/'),
  addToWatchlist:     (symbol) => api.post('/trading/watchlist/', { symbol }),
  removeFromWatchlist:(id)     => api.delete(`/trading/watchlist/${id}/`),

  // Congress Trades
  getCongressTrades: () => api.get('/trading/congress-trades/'),

  // Stock Search (by ticker or company name)
  searchStocks: (query) => api.get('/trading/stock-search/', { params: { q: query } }),
};

export default tradingAPI;
