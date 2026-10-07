import AsyncStorage from '@react-native-async-storage/async-storage';

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const tables: { reset(): Promise<void> }[] = [];

/** A JSON value in AsyncStorage, seeded on first read and cached in memory. Demo mode only. */
export function demoTable<T>(key: string, seed: () => T) {
  let cache: T | undefined;
  const table = {
    async get(): Promise<T> {
      if (cache === undefined) {
        const raw = await AsyncStorage.getItem(key);
        cache = raw ? (JSON.parse(raw) as T) : seed();
        if (!raw) await AsyncStorage.setItem(key, JSON.stringify(cache));
      }
      return cache;
    },
    async set(value: T) {
      cache = value;
      await AsyncStorage.setItem(key, JSON.stringify(value));
    },
    async reset() {
      cache = undefined;
      await AsyncStorage.removeItem(key);
    },
  };
  tables.push(table);
  return table;
}

export const resetDemoData = () => Promise.all(tables.map((t) => t.reset()));
