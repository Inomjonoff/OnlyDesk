import { User, UserRole } from "@nexusdesk/types";
import { sha256, generateSecureToken } from "@nexusdesk/crypto";

export interface StoredUser extends User {
  passwordHash: string;
  twoFactorSecret?: string;
}

export interface StoredRefreshToken {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
}

export class UserRepository {
  private users = new Map<string, StoredUser>(); // key: id
  private emailIndex = new Map<string, string>(); // email -> id
  private refreshTokens = new Map<string, StoredRefreshToken>(); // tokenHash -> StoredRefreshToken

  public async createUser(data: {
    email: string;
    name: string;
    passwordPlain: string;
    role?: UserRole;
  }): Promise<User> {
    const normalizedEmail = data.email.toLowerCase().trim();

    if (this.emailIndex.has(normalizedEmail)) {
      throw new Error("USER_ALREADY_EXISTS");
    }

    const id = `usr_${generateSecureToken(8)}`;
    const passwordHash = sha256(data.passwordPlain);
    const now = new Date();

    const storedUser: StoredUser = {
      id,
      email: normalizedEmail,
      name: data.name,
      passwordHash,
      role: data.role || "USER",
      twoFactorEnabled: false,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(id, storedUser);
    this.emailIndex.set(normalizedEmail, id);

    return this.sanitizeUser(storedUser);
  }

  public async findByEmail(email: string): Promise<StoredUser | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const id = this.emailIndex.get(normalizedEmail);
    if (!id) return null;
    return this.users.get(id) || null;
  }

  public async findById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;
    return this.sanitizeUser(user);
  }

  public verifyPassword(user: StoredUser, passwordPlain: string): boolean {
    const hash = sha256(passwordPlain);
    return user.passwordHash === hash;
  }

  public async saveRefreshToken(userId: string, rawToken: string, ttlMs: number): Promise<void> {
    const tokenHash = sha256(rawToken);
    this.refreshTokens.set(tokenHash, {
      tokenHash,
      userId,
      expiresAt: new Date(Date.now() + ttlMs),
    });
  }

  public async verifyAndRotateRefreshToken(
    rawOldToken: string,
    rawNewToken: string,
    ttlMs: number,
  ): Promise<string | null> {
    const oldHash = sha256(rawOldToken);
    const stored = this.refreshTokens.get(oldHash);

    if (!stored || stored.expiresAt < new Date()) {
      this.refreshTokens.delete(oldHash);
      return null;
    }

    // Revoke old token
    this.refreshTokens.delete(oldHash);

    // Save new rotated token
    const newHash = sha256(rawNewToken);
    this.refreshTokens.set(newHash, {
      tokenHash: newHash,
      userId: stored.userId,
      expiresAt: new Date(Date.now() + ttlMs),
    });

    return stored.userId;
  }

  public async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = sha256(rawToken);
    this.refreshTokens.delete(tokenHash);
  }

  public async setTwoFactorSecret(userId: string, secret: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.twoFactorSecret = secret;
      user.twoFactorEnabled = true;
      user.updatedAt = new Date();
    }
  }

  private sanitizeUser(user: StoredUser): User {
    const { passwordHash: _p, twoFactorSecret: _s, ...clean } = user;
    return clean;
  }
}

export const userRepository = new UserRepository();
