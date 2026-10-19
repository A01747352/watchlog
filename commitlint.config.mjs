/** Conventional Commits con scope opcional, restringido a las piezas del monorepo. */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      ["web", "api", "ui", "config", "contracts", "db", "domain", "providers", "repo", "ci", "deps", "docs"],
    ],
  },
};
