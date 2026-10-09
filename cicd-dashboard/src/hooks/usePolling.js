import { useEffect, useRef, useState, useCallback } from 'react';
import { simulatePipelineTick } from '../api/pipelineApi';

/**
 * Custom hook for periodic background polling with manual trigger and timestamp
 */
export function usePolling(callback, intervalMs = 10000, enabled = true) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const executePoll = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    simulatePipelineTick();
    try {
      if (savedCallback.current) {
        await savedCallback.current();
      }
      setLastUpdated(new Date());
    } finally {
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 300);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Periodic timer
    const id = setInterval(() => {
      executePoll(false);
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs, enabled, executePoll]);

  return {
    isRefreshing,
    lastUpdated,
    refreshNow: () => executePoll(true)
  };
}
