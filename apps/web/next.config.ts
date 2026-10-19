import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Los paquetes internos se publican como TypeScript sin compilar.
  transpilePackages: ["@watchlog/ui", "@watchlog/contracts"],
  // Salida standalone solo para la imagen Docker (`next start` no la admite).
  ...(process.env.NEXT_OUTPUT_STANDALONE === "1" && { output: "standalone" as const }),
  // Fase 2: rewrite de /api/* hacia API_URL.
};

export default nextConfig;
