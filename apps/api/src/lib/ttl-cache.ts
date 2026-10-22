/**
 * Caché en memoria con caducidad y tamaño máximo (descarta la entrada más antigua).
 * Para respuestas de búsqueda "unos minutos" (docs/SPEC.md, caché en dos niveles).
 */
export function createTtlCache<V>({
  ttlMs,
  maxEntries,
  now = Date.now,
}: {
  ttlMs: number;
  maxEntries: number;
  now?: () => number;
}) {
  const entries = new Map<string, { value: V; expiresAt: number }>();

  return {
    get(key: string): V | undefined {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key: string, value: V) {
      entries.delete(key);
      entries.set(key, { value, expiresAt: now() + ttlMs });
      // Map conserva el orden de inserción: la primera clave es la más antigua.
      while (entries.size > maxEntries) entries.delete(entries.keys().next().value!);
    },
    get size() {
      return entries.size;
    },
  };
}

export type TtlCache<V> = ReturnType<typeof createTtlCache<V>>;
