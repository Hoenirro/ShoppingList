// hooks/usePendingChecks.ts
import React from 'react';
import { useState, useRef, useCallback } from 'react';
import { Animated } from 'react-native';

interface PendingCheck {
  timerId: ReturnType<typeof setTimeout>;
  progress: Animated.Value;
}

export const usePendingChecks = () => {
  const [pendingChecks, setPendingChecks] = useState<{ [key: string]: PendingCheck }>({});
  const pendingChecksRef = useRef(pendingChecks);
  
  React.useEffect(() => {
    pendingChecksRef.current = pendingChecks;
  }, [pendingChecks]);

  const startPendingCheck = useCallback((key: string, duration: number, onComplete: () => void) => {
    const progress = new Animated.Value(0);
    Animated.timing(progress, { 
      toValue: 1, 
      duration, 
      useNativeDriver: false 
    }).start();
    
    const timerId = setTimeout(() => {
    setPendingChecks(prev => {
      const newPending = { ...prev };
      delete newPending[key];
      return newPending;
    });
    
    onComplete(); 
  }, duration);

    setPendingChecks(prev => ({ ...prev, [key]: { timerId, progress } }));
    return progress;
  }, []);

  const cancelPendingCheck = useCallback((key: string) => {
    setPendingChecks(prev => {
      const pending = prev[key];
      if (pending) {
        clearTimeout(pending.timerId);
        pending.progress.stopAnimation();
        const newPending = { ...prev };
        delete newPending[key];
        return newPending;
      }
      return prev;
    });
  }, []);

  const clearAllPending = useCallback(() => {
    Object.values(pendingChecksRef.current).forEach(p => {
      clearTimeout(p.timerId);
      p.progress.stopAnimation();
    });
    setPendingChecks({});
  }, []);

  return {
    pendingChecks,
    startPendingCheck,
    cancelPendingCheck,
    clearAllPending,
  };
};