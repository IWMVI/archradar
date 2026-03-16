"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToken = getToken;
exports.isPremium = isPremium;
exports.printStatus = printStatus;
exports.login = login;
exports.logout = logout;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const chalk_1 = __importDefault(require("chalk"));
const readline_1 = __importDefault(require("readline"));
const CONFIG_DIR = path_1.default.join(os_1.default.homedir(), '.archradar');
const CONFIG_FILE = path_1.default.join(CONFIG_DIR, 'config.json');
const API_BASE = process.env.ARCHRADAR_API ?? 'https://api.archradar.few.company';
function readConfig() {
    try {
        const raw = fs_1.default.readFileSync(CONFIG_FILE, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function writeConfig(config) {
    fs_1.default.mkdirSync(CONFIG_DIR, { recursive: true });
    fs_1.default.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}
function getToken() {
    const config = readConfig();
    if (!config)
        return null;
    if (Date.now() > config.expiresAt)
        return null;
    return config.token;
}
function isPremium() {
    return getToken() !== null;
}
function printStatus() {
    const config = readConfig();
    if (!config) {
        console.log(`\n  ${chalk_1.default.yellow('○')} Not authenticated — free tier\n`);
        console.log(`  Run ${chalk_1.default.cyan('archradar auth login')} to unlock premium features.\n`);
        return;
    }
    const expired = Date.now() > config.expiresAt;
    if (expired) {
        console.log(`\n  ${chalk_1.default.red('✗')} Token expired — run ${chalk_1.default.cyan('archradar auth login')} again.\n`);
        return;
    }
    const expiresIn = Math.round((config.expiresAt - Date.now()) / 1000 / 60 / 60 / 24);
    console.log(`\n  ${chalk_1.default.green('✓')} Authenticated as ${chalk_1.default.cyan(config.email)}`);
    console.log(`  ${chalk_1.default.dim(`Token valid for ${expiresIn} more day(s)`)}\n`);
}
async function login() {
    const rl = readline_1.default.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise((res) => rl.question(q, res));
    console.log(`\n  ${chalk_1.default.bold('ARCHRADAR Premium Login')}\n`);
    try {
        const email = await ask(`  ${chalk_1.default.dim('Email:')} `);
        const password = await ask(`  ${chalk_1.default.dim('Password:')} `);
        rl.close();
        console.log('');
        const spinner = (await Promise.resolve().then(() => __importStar(require('ora')))).default('Authenticating...').start();
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            spinner.fail('Authentication failed — check your credentials');
            return;
        }
        const data = (await res.json());
        const expiresAt = Date.now() + data.expiresIn * 1000;
        writeConfig({ token: data.token, email, expiresAt });
        spinner.succeed(`Logged in as ${chalk_1.default.cyan(email)}`);
        console.log(`  ${chalk_1.default.dim('Token saved to')} ${chalk_1.default.cyan(CONFIG_FILE)}\n`);
    }
    catch (err) {
        rl.close();
        console.log(`\n  ${chalk_1.default.red('✗')} Login failed: ${err.message}\n`);
    }
}
function logout() {
    try {
        fs_1.default.unlinkSync(CONFIG_FILE);
        console.log(`\n  ${chalk_1.default.green('✓')} Logged out successfully\n`);
    }
    catch {
        console.log(`\n  ${chalk_1.default.dim('Already logged out')}\n`);
    }
}
//# sourceMappingURL=authClient.js.map