import { serve } from "@hono/node-server";

import { createApp } from "./app";
import { parseEnv } from "./env";

const env = parseEnv(process.env);
const app = createApp({ log: env.NODE_ENV !== "test" });

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`api escuchando en http://localhost:${info.port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
