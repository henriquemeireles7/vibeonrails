/**
 * Seed runner — call the appropriate seed based on NODE_ENV.
 *
 * Usage: npx vibe db:seed
 */

import { seedDevelopment } from "./development.js";

async function main(): Promise<void> {
  const env = process.env["NODE_ENV"] ?? "development";

  switch (env) {
    case "development":
      await seedDevelopment();
      break;
    case "test":
      console.log("Use seedTest() directly in your test setup.");
      break;
    default:
      console.error(`❌ Seeding is not supported in "${env}" environment.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
