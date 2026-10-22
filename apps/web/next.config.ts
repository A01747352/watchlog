import type { NextConfig } from "next";

import { apiUrl } from "./src/lib/api-url";

const nextConfig: NextConfig = {
  // Los paquetes internos se publican como TypeScript sin compilar.
  transpilePackages: ["@watchlog/ui", "@watchlog/contracts"],
  // Salida standalone solo para la imagen Docker (`next start` no la admite).
  ...(process.env.NEXT_OUTPUT_STANDALONE === "1" && { output: "standalone" as const }),
  // Pósters de TMDB y AniList (docs/design/HANDOFF.md §8: next/image con `sizes`).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
      { protocol: "https", hostname: "s4.anilist.co", pathname: "/file/anilistcdn/**" },
    ],
  },
  // Un solo dominio para el navegador: cookies de sesión sin CORS (docs/SPEC.md).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl()}/api/:path*` }];
  },
};

export default nextConfig;
