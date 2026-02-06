import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyToken,
} from "@vibeonrails/core/security";
import type { RegisterInput, LoginInput, AuthTokens, AuthUser } from "./auth.types.js";

// ---------------------------------------------------------------------------
// AuthService — Business Logic
// ---------------------------------------------------------------------------

// TODO: Replace in-memory store with database queries
const users: Map<string, { id: string; email: string; name: string; passwordHash: string }> =
  new Map();

export const AuthService = {
  async register(input: RegisterInput): Promise<AuthTokens> {
    // Check if user already exists
    for (const user of users.values()) {
      if (user.email === input.email) {
        throw new Error("User with this email already exists");
      }
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(input.password);

    users.set(id, {
      id,
      email: input.email,
      name: input.name,
      passwordHash,
    });

    return AuthService.generateTokens({ id, email: input.email, name: input.name });
  },

  async login(input: LoginInput): Promise<AuthTokens> {
    let foundUser: { id: string; email: string; name: string; passwordHash: string } | undefined;

    for (const user of users.values()) {
      if (user.email === input.email) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      throw new Error("Invalid email or password");
    }

    const isValid = await verifyPassword(input.password, foundUser.passwordHash);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    return AuthService.generateTokens({
      id: foundUser.id,
      email: foundUser.email,
      name: foundUser.name,
    });
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = await verifyToken(refreshToken);
    const userId = payload.sub as string;
    const user = users.get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    return AuthService.generateTokens({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  },

  async me(userId: string): Promise<AuthUser | null> {
    const user = users.get(userId);
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name };
  },

  async generateTokens(user: AuthUser): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ sub: user.id, email: user.email }),
      signRefreshToken({ sub: user.id }),
    ]);

    return { accessToken, refreshToken };
  },
};
