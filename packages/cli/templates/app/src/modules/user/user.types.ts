import { z } from "zod";

// ---------------------------------------------------------------------------
// User — Schemas
// ---------------------------------------------------------------------------

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  role: z.enum(["user", "admin"]).default("user"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

// ---------------------------------------------------------------------------
// User — Types
// ---------------------------------------------------------------------------

export type User = z.infer<typeof UserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
