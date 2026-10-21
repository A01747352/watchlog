import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/prisma/client";

export * from "./generated/prisma/client";

/** Crea un cliente Prisma sobre `pg` (Prisma 7 usa driver adapters). */
export function createDbClient(databaseUrl: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}

export type DbClient = ReturnType<typeof createDbClient>;
