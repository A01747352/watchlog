import { useSyncExternalStore } from "react";

/** Búsquedas recientes del usuario en este navegador (comodidad local, no datos de la cuenta). */
const KEY = "watchlog:recent-searches";
const MAX = 6;
const EMPTY: string[] = [];

let cache: string[] | null = null;
const listeners = new Set<() => void>();

function read(): string[] {
  if (cache) return cache;
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, MAX) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: string[]) {
  cache = next;
  try {
    if (next.length) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    // Almacenamiento bloqueado (modo privado): se queda solo en memoria.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Lista reactiva; en el servidor (y en la hidratación) está vacía. */
export function useRecentSearches() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function addRecentSearch(term: string) {
  const clean = term.trim();
  if (!clean) return;
  write([clean, ...read().filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, MAX));
}

export function clearRecentSearches() {
  write([]);
}
