import { useState, useCallback } from 'react';

const KEY = 'pwhl_watchlist';

export const useWatchlist = () => {
  const [watchlist, setWatchlist] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
    } catch {
      return new Set();
    }
  });

  const toggle = useCallback((playerId) => {
    setWatchlist(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      localStorage.setItem(KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isWatched = useCallback((playerId) => watchlist.has(playerId), [watchlist]);

  return { watchlist, toggle, isWatched };
};
