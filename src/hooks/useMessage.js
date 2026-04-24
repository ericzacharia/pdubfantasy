import { useState, useCallback } from 'react';

export const useMessage = (duration = 4000) => {
  const [message, setMessage] = useState(null);

  const showMessage = useCallback((type, text, ms = duration) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), ms);
  }, [duration]);

  const clearMessage = useCallback(() => setMessage(null), []);

  return { message, showMessage, clearMessage };
};
