import { useProjectStore } from "@/store/projectStore";
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const SYNC_INTERVAL = 30000; // 30 seconds

export const useProjectSync = () => {
  const syncProjects = useProjectStore(state => state.syncProjects);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Sync every 30 seconds
    intervalRef.current = setInterval(() => {
      syncProjects();
    }, SYNC_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [syncProjects]);

  useEffect(() => {
    // Sync when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('App became active - syncing projects');
        syncProjects();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [syncProjects]);
};