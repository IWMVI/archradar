#!/usr/bin/env node
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
const commander_1 = require("commander");
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const Scanner = __importStar(require("../src/core/scanner/index.js"));
const Analyzer = __importStar(require("../src/core/analyzer/index.js"));
const ScoreEngine = __importStar(require("../src/core/scoring/index.js"));
const Reporter = __importStar(require("../src/core/report/index.js"));
const authClient_js_1 = require("../src/premium/authClient.js");
const apiClient_js_1 = require("../src/premium/apiClient.js");
const program = new commander_1.Command();
program
    .name('archradar')
    .description('Architectural Intelligence Engine for modern frontend teams — by Few Company')
    .version('0.1.0');
program
    .command('scan [projectPath]')
    .description('Analyze the architectural health of a frontend project')
    .action(async (projectPath) => {
    const targetPath = path_1.default.resolve(projectPath ?? '.');
    const spinner = (0, ora_1.default)('Scanning project...').start();
    try {
        spinner.text = 'Scanning files and dependencies...';
        const scanResult = await Scanner.run(targetPath);
        spinner.text = 'Running AST analysis...';
        const analysisResult = await Analyzer.run(targetPath);
        spinner.text = 'Calculating architectural score...';
        const scoreResult = ScoreEngine.run(scanResult, analysisResult);
        spinner.succeed('Analysis complete');
        Reporter.display(scanResult, analysisResult, scoreResult);
        // Premium: send metadata and show extra insights
        if ((0, authClient_js_1.isPremium)()) {
            const token = (0, authClient_js_1.getToken)();
            spinner.start('Fetching premium insights...');
            try {
                const insights = await (0, apiClient_js_1.sendScanMetadata)(token, scanResult, scoreResult);
                if (insights) {
                    spinner.succeed('Premium insights loaded');
                    console.log('\n  ' + chalk_1.default.cyan('● PREMIUM INSIGHTS'));
                    insights.forEach((line) => console.log(`  ${chalk_1.default.dim('›')} ${line}`));
                }
            }
            catch {
                spinner.warn('Premium API unavailable — showing free results only');
            }
        }
    }
    catch (err) {
        spinner.fail('Analysis failed');
        if (err instanceof Error) {
            console.error(err.message);
        }
        process.exit(1);
    }
});
const auth = program.command('auth').description('Manage premium authentication');
auth
    .command('login')
    .description('Authenticate with your ARCHRADAR premium account')
    .action(async () => {
    const { login } = await Promise.resolve().then(() => __importStar(require('../src/premium/authClient.js')));
    await login();
});
auth
    .command('logout')
    .description('Remove stored credentials')
    .action(async () => {
    const { logout } = await Promise.resolve().then(() => __importStar(require('../src/premium/authClient.js')));
    logout();
});
auth
    .command('status')
    .description('Show current authentication status')
    .action(async () => {
    const { printStatus } = await Promise.resolve().then(() => __importStar(require('../src/premium/authClient.js')));
    printStatus();
});
program.parse(process.argv);
// default: run scan on cwd if no command given
if (process.argv.length === 2) {
    program.parse(['node', 'archradar', 'scan']);
}
//# sourceMappingURL=cli.js.map