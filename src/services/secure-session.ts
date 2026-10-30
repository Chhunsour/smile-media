/** Keychain adapter logic is independent of native modules so crash/rotation behavior is testable. */
type SecureStore = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};
type LegacyStore = { getItem(key: string): Promise<string | null>; removeItem(key: string): Promise<void> };
type Manifest = { generation: string; count: number };
const CHUNK = 1800;
const parse = (raw: string | null): Manifest | null => {
  if (!raw) return null;
  const m = JSON.parse(raw);
  if (!/^[\w.]+$/.test(m.generation) || !Number.isInteger(m.count) || m.count < 1 || m.count > 100) {
    throw new Error('Invalid secure session');
  }
  return m;
};
export function createSecureSessionStorage(secure: SecureStore, legacy: LegacyStore) {
  const locks = new Map<string, Promise<unknown>>();
  const locked = <T>(key: string, fn: () => Promise<T>): Promise<T> => {
    const task = (locks.get(key) ?? Promise.resolve()).catch(() => {}).then(fn);
    locks.set(key, task);
    return task;
  };
  const removeChunks = async (key: string, m: Manifest | null) => {
    if (m) await Promise.all(Array.from({ length: m.count }, (_, i) => secure.deleteItemAsync(`${key}.${m.generation}.${i}`)));
  };
  const recover = async (key: string) => {
    const journal = await secure.getItemAsync(`${key}.pending`);
    if (!journal) return;
    const { next, previous } = JSON.parse(journal);
    const current = parse(await secure.getItemAsync(key));
    await removeChunks(key, current?.generation === next.generation ? previous : next);
    await secure.deleteItemAsync(`${key}.pending`);
  };
  const write = async (key: string, value: string) => {
    const previous = parse(await secure.getItemAsync(key));
    const next = {
      generation: `${Date.now()}.${Math.random().toString(36).slice(2)}`,
      count: Math.max(1, Math.ceil(value.length / CHUNK)),
    };
    if (next.count > 100) throw new Error('Session is too large');
    await secure.setItemAsync(`${key}.pending`, JSON.stringify({ next, previous }));
    for (let i = 0; i < next.count; i++) {
      await secure.setItemAsync(`${key}.${next.generation}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
    await secure.setItemAsync(key, JSON.stringify(next));
    await removeChunks(key, previous);
    await secure.deleteItemAsync(`${key}.pending`);
  };
  const safeKey = (key: string) => `multipostly.${key.replace(/[^\w.-]/g, '_')}`;
  return {
    getItem(key: string) {
      return locked(key, async () => {
        const k = safeKey(key);
        await recover(k);
        const m = parse(await secure.getItemAsync(k));
        if (!m) {
          const value = await legacy.getItem(key);
          if (value !== null) {
            await write(k, value);
            await legacy.removeItem(key);
          }
          return value;
        }
        const parts = await Promise.all(Array.from({ length: m.count }, (_, i) => secure.getItemAsync(`${k}.${m.generation}.${i}`)));
        return parts.some((p) => p === null) ? null : parts.join('');
      });
    },
    setItem(key: string, value: string) {
      return locked(key, async () => {
        const k = safeKey(key);
        await recover(k);
        await write(k, value);
        await legacy.removeItem(key);
      });
    },
    removeItem(key: string) {
      return locked(key, async () => {
        const k = safeKey(key);
        await recover(k);
        const m = parse(await secure.getItemAsync(k));
        await removeChunks(k, m);
        await secure.deleteItemAsync(k);
        await legacy.removeItem(key);
      });
    },
  };
}
