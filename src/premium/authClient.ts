import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import readline from 'readline';

const CONFIG_DIR = path.join(os.homedir(), '.archradar');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const API_BASE = process.env.ARCHRADAR_API ?? 'https://api.archradar.few.company';

interface Config {
  token: string;
  email: string;
  expiresAt: number;
}

function readConfig(): Config | null {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as Config;
  } catch {
    return null;
  }
}

function writeConfig(config: Config): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function getToken(): string | null {
  const config = readConfig();
  if (!config) return null;
  if (Date.now() > config.expiresAt) return null;
  return config.token;
}

export function isPremium(): boolean {
  return getToken() !== null;
}

export function printStatus(): void {
  const config = readConfig();
  if (!config) {
    console.log(`\n  ${chalk.yellow('○')} Not authenticated — free tier\n`);
    console.log(`  Run ${chalk.cyan('archradar auth login')} to unlock premium features.\n`);
    return;
  }
  const expired = Date.now() > config.expiresAt;
  if (expired) {
    console.log(`\n  ${chalk.red('✗')} Token expired — run ${chalk.cyan('archradar auth login')} again.\n`);
    return;
  }
  const expiresIn = Math.round((config.expiresAt - Date.now()) / 1000 / 60 / 60 / 24);
  console.log(`\n  ${chalk.green('✓')} Authenticated as ${chalk.cyan(config.email)}`);
  console.log(`  ${chalk.dim(`Token valid for ${expiresIn} more day(s)`)}\n`);
}

export async function login(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> => new Promise((res) => rl.question(q, res));

  console.log(`\n  ${chalk.bold('ARCHRADAR Premium Login')}\n`);

  try {
    const email = await ask(`  ${chalk.dim('Email:')} `);
    const password = await ask(`  ${chalk.dim('Password:')} `);
    rl.close();

    console.log('');
    const spinner = (await import('ora')).default('Authenticating...').start();

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      spinner.fail('Authentication failed — check your credentials');
      return;
    }

    const data = (await res.json()) as { token: string; expiresIn: number };
    const expiresAt = Date.now() + data.expiresIn * 1000;

    writeConfig({ token: data.token, email, expiresAt });
    spinner.succeed(`Logged in as ${chalk.cyan(email)}`);
    console.log(`  ${chalk.dim('Token saved to')} ${chalk.cyan(CONFIG_FILE)}\n`);
  } catch (err) {
    rl.close();
    console.log(`\n  ${chalk.red('✗')} Login failed: ${(err as Error).message}\n`);
  }
}

export function logout(): void {
  try {
    fs.unlinkSync(CONFIG_FILE);
    console.log(`\n  ${chalk.green('✓')} Logged out successfully\n`);
  } catch {
    console.log(`\n  ${chalk.dim('Already logged out')}\n`);
  }
}
