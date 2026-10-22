import type { Source } from "./types";

/** Error de un proveedor externo. `status` es 0 si no hubo respuesta (red, timeout). */
export class ProviderError extends Error {
  constructor(
    readonly source: Source,
    readonly status: number,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ProviderError";
  }
}

export type HttpClientOptions = {
  source: Source;
  fetch?: typeof fetch;
  /** Reintentos tras el primer intento (429, 5xx y errores de red). */
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  /** Inyectable en tests para no esperar de verdad. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
};

const defaultSleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });

/** `Retry-After` en segundos o como fecha HTTP. */
export function parseRetryAfter(value: string | null, now = Date.now()): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

const isRetryableStatus = (status: number) => status === 429 || status >= 500;

/**
 * Cliente HTTP con reintentos y backoff exponencial (con jitter). Ante 429 respeta
 * `Retry-After` (docs/SPEC.md, "Reglas para la implementación").
 */
export function createHttpClient({
  source,
  // Se resuelve en cada petición (no al crear el cliente) para respetar a quien parchee
  // `fetch` después, como MSW en los tests.
  fetch: fetchImpl = (input, init) => globalThis.fetch(input, init),
  retries = 3,
  baseDelayMs = 500,
  maxDelayMs = 10_000,
  timeoutMs = 10_000,
  sleep = defaultSleep,
}: HttpClientOptions) {
  return async function request(url: string, init: RequestInit = {}): Promise<Response> {
    let lastError: ProviderError | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const signals = [AbortSignal.timeout(timeoutMs), init.signal].filter((s): s is AbortSignal => !!s);
      let res: Response;
      try {
        res = await fetchImpl(url, { ...init, signal: AbortSignal.any(signals) });
      } catch (error) {
        if (init.signal?.aborted) throw error;
        lastError = new ProviderError(source, 0, `${source}: sin respuesta (${String(error)})`, {
          cause: error,
        });
        if (attempt < retries) await sleep(backoff(attempt), init.signal ?? undefined);
        continue;
      }

      if (res.ok) return res;

      lastError = new ProviderError(source, res.status, `${source} respondió ${res.status}`);
      if (!isRetryableStatus(res.status) || attempt === retries) break;

      const retryAfter = res.status === 429 ? parseRetryAfter(res.headers.get("retry-after")) : null;
      await res.body?.cancel();
      await sleep(Math.min(retryAfter ?? backoff(attempt), maxDelayMs), init.signal ?? undefined);
    }

    throw lastError ?? new ProviderError(source, 0, `${source}: error desconocido`);
  };

  function backoff(attempt: number) {
    const exponential = baseDelayMs * 2 ** attempt;
    return Math.min(maxDelayMs, exponential / 2 + Math.random() * (exponential / 2));
  }
}

export type HttpRequest = ReturnType<typeof createHttpClient>;
