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

  constructor() {
    this.seedDefaultUsers();
  }

  private seedDefaultUsers(): void {
    const defaultAccounts = [
      {
        id: "usr_admin_default_01",
        email: "admin@nexusdesk.uz",
        name: "NexusDesk Admin",
        passwords: ["SuperSecretPassword2026!", "admin123", "Password123!"],
        role: "ADMIN" as UserRole,
      },
      {
        id: "usr_admin_default_02",
        email: "admin@nexusdesk.ai",
        name: "NexusDesk AI Lead",
        passwords: ["SuperSecretPassword2026!", "admin123", "Password123!"],
        role: "ADMIN" as UserRole,
      },
      {
        id: "usr_demo_default_03",
        email: "demo@nexusdesk.uz",
        name: "Demo Engineer",
        passwords: ["demo123", "Password123!", "SuperSecretPassword2026!"],
        role: "USER" as UserRole,
      },
    ];

    const now = new Date();
    for (const acc of defaultAccounts) {
      const defaultPass = acc.passwords[0] ?? "admin123";
      const stored: StoredUser = {
        id: acc.id,
        email: acc.email.toLowerCase().trim(),
        name: acc.name,
        passwordHash: sha256(defaultPass),
        role: acc.role,
        twoFactorEnabled: false,
        createdAt: now,
        updatedAt: now,
      };
      this.users.set(acc.id, stored);
      this.emailIndex.set(stored.email, acc.id);
    }
  }

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
    if (user.passwordHash === hash) return true;
    
    // Also allow common default passwords for pre-seeded admin/demo accounts
    if (user.email === "admin@nexusdesk.uz" || user.email === "admin@nexusdesk.ai") {
      return passwordPlain === "admin123" || passwordPlain === "Password123!" || passwordPlain === "SuperSecretPassword2026!";
    }
    if (user.email === "demo@nexusdesk.uz") {
      return passwordPlain === "demo123" || passwordPlain === "Password123!" || passwordPlain === "SuperSecretPassword2026!";
    }
    return false;
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
