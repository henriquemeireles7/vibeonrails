import type { Database } from "../client.js";
import { seedDevelopment } from "./development.js";
import { seedTest } from "./test.js";

export type SeedEnvironment = "development" | "test";

/**
 * Run database seeds for the given environment.
 *
 * @param db - Drizzle database instance
 * @param env - Which seed set to run (defaults to NODE_ENV)
 */
export async function runSeeds(db: Database, env?: SeedEnvironment): Promise<void> {
  const target = env ?? (process.env["NODE_ENV"] as SeedEnvironment) ?? "development";

  console.log(`Running ${target} seeds...`);

  switch (target) {
    case "test":
      await seedTest(db);
      break;
    case "development":
    default:
      await seedDevelopment(db);
      break;
  }

  console.log("Seeds complete.");
}

export { seedDevelopment } from "./development.js";
export { seedTest } from "./test.js";
