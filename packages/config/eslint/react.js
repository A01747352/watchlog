import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

import base from "./base.js";

/** Base + React, hooks y accesibilidad (para packages/ui). */
export default tseslint.config(...base, {
  files: ["**/*.{ts,tsx,js,jsx}"],
  plugins: { react, "react-hooks": reactHooks, "jsx-a11y": jsxA11y },
  languageOptions: {
    globals: { ...globals.browser },
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
  settings: { react: { version: "detect" } },
  rules: {
    ...react.configs.flat.recommended.rules,
    ...react.configs.flat["jsx-runtime"].rules,
    ...reactHooks.configs.recommended.rules,
    ...jsxA11y.flatConfigs.recommended.rules,
    "react/prop-types": "off",
  },
});
