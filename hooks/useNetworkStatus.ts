
import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Initial check
    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected ?? true);
      setIsChecking(false);
    });

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

  return { isOnline, isChecking };
}
