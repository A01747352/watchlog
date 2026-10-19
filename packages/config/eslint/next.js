import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

import react from "./react.js";

/** React + reglas de Next.js (Core Web Vitals) para apps/web. */
export default tseslint.config(...react, {
  plugins: { "@next/next": nextPlugin },
  rules: {
    ...nextPlugin.configs.recommended.rules,
    ...nextPlugin.configs["core-web-vitals"].rules,
  },
});
