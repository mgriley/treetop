import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const SECRETS_PATH = join(process.env.DATA_ROOT ?? '/treetop-data', 'secrets.json');

type Secrets = Record<string, string>;

function read(): Secrets {
  if (!existsSync(SECRETS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SECRETS_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function write(secrets: Secrets): void {
  writeFileSync(SECRETS_PATH, JSON.stringify(secrets, null, 2), 'utf8');
}

export const SecretsStore = {
  get(key: string): string | undefined {
    return read()[key];
  },

  set(key: string, value: string): void {
    const secrets = read();
    secrets[key] = value;
    write(secrets);
  },

  delete(key: string): boolean {
    const secrets = read();
    if (!(key in secrets)) return false;
    delete secrets[key];
    write(secrets);
    return true;
  },

  keys(): string[] {
    return Object.keys(read());
  },
};
