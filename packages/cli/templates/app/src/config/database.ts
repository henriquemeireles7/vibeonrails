import { createDatabase } from "@vibeonrails/core/database";
import { env } from "./env.js";

// ---------------------------------------------------------------------------
// Database Client
// ---------------------------------------------------------------------------

export const db = createDatabase(env.DATABASE_URL);
