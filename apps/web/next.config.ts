import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  // Los paquetes internos se publican como TypeScript sin compilar.
  transpilePackages: ["@watchlog/ui", "@watchlog/contracts"],
  // Salida standalone solo para la imagen Docker (`next start` no la admite).
  ...(process.env.NEXT_OUTPUT_STANDALONE === "1" && { output: "standalone" as const }),
  // Un solo dominio para el navegador: cookies de sesión sin CORS (docs/SPEC.md).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
