/**
 * URL interna de la API. Next.js solo lee los `.env` de apps/web, no el de la raíz del monorepo,
 * así que en desarrollo se usa el puerto por defecto de la API. Docker y producción definen API_URL.
 * La comparten `next.config.ts` (rewrites) y el cliente de servidor.
 */
export const apiUrl = () => process.env.API_URL ?? "http://localhost:3001";
