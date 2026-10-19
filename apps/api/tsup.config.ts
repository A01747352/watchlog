import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node24",
  clean: true,
  sourcemap: true,
  // Bundle autocontenido: incluye los paquetes internos (publicados como TypeScript)
  // y las dependencias, así la imagen Docker solo necesita dist/.
  noExternal: [/.*/],
  banner: {
    // Algunas dependencias CJS usan require() dentro del bundle ESM.
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
