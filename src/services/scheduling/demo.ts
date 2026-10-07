import { AppState } from 'react-native';

import type { SchedulingProvider } from '../types';

/** Demo scheduling runs on the device: due posts publish while the app is open. */
export const demoScheduling: SchedulingProvider = {
  schedule: async () => {},
  cancel: async () => {},
  watch(tick) {
    tick();
    const timer = setInterval(tick, 30_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  },
};
