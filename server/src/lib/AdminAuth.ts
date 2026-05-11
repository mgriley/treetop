import { readFileSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

const HASH_PATH = join(process.env.DATA_ROOT ?? '/treetop-data', 'admin.hash');

let passwordHash: string;
const tokens = new Set<string>();

export const AdminAuth = {
  init(): void {
    try {
      passwordHash = readFileSync(HASH_PATH, 'utf8').trim();
    } catch {
      throw new Error(
        `Admin password hash not found at ${HASH_PATH}.\n` +
        `Set one before starting the server: node scripts/set-admin-password.js <password>`,
      );
    }
  },

  async verify(password: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  },

  createToken(): string {
    const token = randomBytes(32).toString('hex');
    tokens.add(token);
    return token;
  },

  checkToken(token: string): boolean {
    return tokens.has(token);
  },

  revokeToken(token: string): void {
    tokens.delete(token);
  },
};
