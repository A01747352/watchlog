import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    globalSetup: ["./tests/support/global-setup.ts"],
    // Los tests de integración comparten la base de datos de test: en serie.
    fileParallelism: false,
  },
});
