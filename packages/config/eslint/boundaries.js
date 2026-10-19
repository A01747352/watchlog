/**
 * Reglas de dependencias entre paquetes (ver docs/SPEC.md, "Regla de dependencias").
 * Cada app/paquete añade el bloque que le corresponde a su eslint.config.js.
 */

const message = (who, what) =>
  `${who} no puede importar ${what}. Revisa la regla de dependencias en docs/SPEC.md.`;

/** apps/web solo importa @watchlog/contracts y @watchlog/ui. */
export const webBoundaries = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@watchlog/db", "@watchlog/db/*", "@prisma/*"],
            message: message("apps/web", "la base de datos"),
          },
          {
            group: ["@watchlog/domain", "@watchlog/domain/*"],
            message: message("apps/web", "packages/domain"),
          },
          {
            group: ["@watchlog/providers", "@watchlog/providers/*"],
            message: message("apps/web", "packages/providers"),
          },
          {
            group: ["**/apps/api/**", "api", "api/*"],
            message: message("apps/web", "código de apps/api (usa el cliente tipado)"),
          },
        ],
      },
    ],
  },
};

/** packages/domain es puro: sin Hono, Next.js ni Prisma. */
export const domainBoundaries = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          { group: ["hono", "hono/*", "@hono/*"], message: message("packages/domain", "Hono") },
          {
            group: ["next", "next/*", "react", "react/*"],
            message: message("packages/domain", "Next.js ni React"),
          },
          {
            group: ["@prisma/*", "@watchlog/db", "@watchlog/db/*"],
            message: message("packages/domain", "Prisma"),
          },
        ],
      },
    ],
  },
};

/** Los paquetes compartidos nunca dependen de las apps. */
export const packageBoundaries = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["**/apps/**", "web", "web/*", "api", "api/*"],
            message: "Un paquete no puede importar una app.",
          },
        ],
      },
    ],
  },
};
