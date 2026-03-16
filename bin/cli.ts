#!/usr/bin/env node

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import * as Scanner from '../src/core/scanner/index.js';
import * as Analyzer from '../src/core/analyzer/index.js';
import * as ScoreEngine from '../src/core/scoring/index.js';
import * as Reporter from '../src/core/report/index.js';
import { isPremium, getToken } from '../src/premium/authClient.js';
import { sendScanMetadata } from '../src/premium/apiClient.js';

const program = new Command();

program
  .name('archradar')
  .description('Architectural Intelligence Engine for modern frontend teams — by Few Company')
  .version('0.1.0');

program
  .command('scan [projectPath]')
  .description('Analyze the architectural health of a frontend project')
  .action(async (projectPath?: string) => {
    const targetPath = path.resolve(projectPath ?? '.');
    const spinner = ora('Scanning project...').start();

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
      if (isPremium()) {
        const token = getToken()!;
        spinner.start('Fetching premium insights...');
        try {
          const insights = await sendScanMetadata(token, scanResult, scoreResult);
          if (insights) {
            spinner.succeed('Premium insights loaded');
            console.log('\n  ' + chalk.cyan('● PREMIUM INSIGHTS'));
            insights.forEach((line: string) => console.log(`  ${chalk.dim('›')} ${line}`));
          }
        } catch {
          spinner.warn('Premium API unavailable — showing free results only');
        }
      }
    } catch (err: unknown) {
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
    const { login } = await import('../src/premium/authClient.js');
    await login();
  });

auth
  .command('logout')
  .description('Remove stored credentials')
  .action(async () => {
    const { logout } = await import('../src/premium/authClient.js');
    logout();
  });

auth
  .command('status')
  .description('Show current authentication status')
  .action(async () => {
    const { printStatus } = await import('../src/premium/authClient.js');
    printStatus();
  });

program.parse(process.argv);

// default: run scan on cwd if no command given
if (process.argv.length === 2) {
  program.parse(['node', 'archradar', 'scan']);
}
