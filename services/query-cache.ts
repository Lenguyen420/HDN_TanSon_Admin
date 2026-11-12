export function createQueryCache<K extends string, V>(ttl = 30_000) {
  const entries = new Map<
    K,
    { value?: V; expires: number; version: number; pending?: Promise<V> }
  >();
  const listeners = new Set<(key: K) => void>();
  const entry = (key: K) => {
    if (!entries.has(key)) entries.set(key, { expires: 0, version: 0 });
    return entries.get(key)!;
  };
  const cache = {
    peek(key: K): V | undefined {
      return entries.get(key)?.value;
    },
    async get(key: K, load: () => Promise<V>): Promise<V> {
      const item = entry(key);
      if (item.value !== undefined && item.expires > Date.now())
        return item.value;
      if (item.pending) return item.pending;
      const version = item.version;
      const pending = load()
        .then((value) => {
          if (version !== item.version)
            return item.value ?? cache.get(key, load);
          item.value = value;
          item.expires = Date.now() + ttl;
          return value;
        })
        .finally(() => {
          if (item.pending === pending) item.pending = undefined;
        });
      item.pending = pending;
      return pending;
    },
    update(key: K, change: (value: V | undefined) => V | undefined) {
      const item = entry(key);
      item.version++;
      item.pending = undefined;
      item.value = change(item.value);
      item.expires = item.value === undefined ? 0 : Date.now() + ttl;
      for (const listener of listeners) listener(key);
    },
    invalidate(key: K) {
      cache.update(key, () => undefined);
    },
    subscribe(listener: (key: K) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return cache;
}
