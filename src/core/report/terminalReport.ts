import chalk from 'chalk';
import boxen from 'boxen';
import path from 'path';
import { ScanResult, AnalysisResult, ScoreResult, RiskLevel } from '../../types/index.js';

const RISK_COLOR: Record<RiskLevel, (s: string) => string> = {
  LOW: chalk.green,
  MEDIUM: chalk.yellow,
  HIGH: chalk.red,
  CRITICAL: chalk.bgRed.white,
};

function scoreBar(score: number): string {
  const filled = Math.round(score / 5);
  const empty = 20 - filled;
  return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

function gradeColor(grade: string): string {
  const map: Record<string, (s: string) => string> = {
    A: chalk.green,
    B: chalk.cyan,
    C: chalk.yellow,
    D: chalk.red,
    F: chalk.bgRed.white,
  };
  return (map[grade] ?? chalk.white)(grade);
}

export function display(scan: ScanResult, analysis: AnalysisResult, score: ScoreResult): void {
  const projectName = path.basename(scan.projectPath);

  // Header
  const header = boxen(
    chalk.bold.white('ARCHRADAR') +
      chalk.gray(' — Architectural Intelligence\n') +
      chalk.dim('by Few Company'),
    {
      padding: { top: 0, bottom: 0, left: 2, right: 2 },
      borderStyle: 'round',
      borderColor: 'cyan',
    }
  );
  console.log('\n' + header);

  // Project info
  console.log('');
  console.log(`  ${chalk.dim('Project:')}   ${chalk.white.bold(projectName)}`);
  console.log(
    `  ${chalk.dim('Framework:')} ${chalk.white(scan.framework.framework)}${scan.framework.version ? chalk.dim(' ' + scan.framework.version) : ''}`
  );
  console.log(`  ${chalk.dim('Bundler:')}   ${chalk.white(scan.framework.bundler)}`);
  console.log(`  ${chalk.dim('Files:')}     ${chalk.white(scan.files.totalFiles.toString())}`);
  console.log(`  ${chalk.dim('Avg lines:')} ${chalk.white(scan.files.avgLinesPerFile.toString())}`);
  console.log(`  ${chalk.dim('Total deps:')}${chalk.white(' ' + scan.dependencies.totalDeps.toString())}`);

  // Score
  console.log('');
  console.log(chalk.dim('  ─────────────────────────────────────────'));
  console.log(chalk.bold('  ARCHITECTURAL HEALTH SCORE'));
  console.log(chalk.dim('  ─────────────────────────────────────────'));
  console.log('');
  console.log(`  ${scoreBar(score.health.score)}  ${chalk.bold.white(String(score.health.score))}${chalk.dim('/100')}  [${gradeColor(score.health.grade)}]`);
  console.log('');
  const riskFn = RISK_COLOR[score.risk.riskLevel];
  console.log(`  Risk Level: ${riskFn(score.risk.riskLevel)}`);
  console.log(`  ${chalk.dim(score.risk.riskDescription)}`);

  // Score breakdown
  console.log('');
  console.log(chalk.dim('  ─────────────────────────────────────────'));
  console.log(chalk.bold('  BREAKDOWN'));
  console.log(chalk.dim('  ─────────────────────────────────────────'));
  console.log('');
  const b = score.breakdown;
  printBreakdownLine('File size', b.fileSize);
  printBreakdownLine('Critical files', b.criticalFiles);
  printBreakdownLine('Structure', b.structure);
  printBreakdownLine('Dependencies', b.dependencies);
  printBreakdownLine('Coupling', b.coupling);
  printBreakdownLine('Complexity', b.complexity);
  printBreakdownLine('Modularity', b.modularity);

  // Findings
  console.log('');
  console.log(chalk.dim('  ─────────────────────────────────────────'));
  console.log(chalk.bold('  FINDINGS'));
  console.log(chalk.dim('  ─────────────────────────────────────────'));
  console.log('');

  if (scan.files.criticalFiles.length > 0) {
    console.log(`  ${chalk.yellow('⚠')}  ${scan.files.criticalFiles.length} arquivo(s) crítico(s) (>300 linhas)`);
    scan.files.criticalFiles.slice(0, 3).forEach((f) => {
      console.log(`     ${chalk.dim('→')} ${chalk.red(f.path)} ${chalk.dim(`(${f.lines} linhas)`)}`);
    });
  } else {
    console.log(`  ${chalk.green('✓')}  Nenhum arquivo crítico detectado`);
  }

  if (scan.dependencies.suspiciousDeps.length > 0) {
    scan.dependencies.suspiciousDeps.forEach((s) => {
      console.log(`  ${chalk.yellow('⚠')}  ${s}`);
    });
  } else {
    console.log(`  ${chalk.green('✓')}  Dependências sem sobreposição`);
  }

  if (scan.dependencies.heavyDeps.length > 0) {
    console.log(`  ${chalk.yellow('⚠')}  Dependências pesadas: ${chalk.red(scan.dependencies.heavyDeps.join(', '))}`);
  }

  if (scan.structure.hasRecognizedPattern) {
    console.log(`  ${chalk.green('✓')}  Estrutura reconhecível: ${chalk.cyan(scan.structure.patternName)}`);
  } else {
    console.log(`  ${chalk.yellow('⚠')}  Estrutura de pastas sem padrão reconhecível`);
  }

  // AST findings
  if (analysis.complexity.hotspots.length > 0) {
    const worst = analysis.complexity.hotspots[0];
    console.log(`  ${chalk.yellow('⚠')}  Complexidade alta: ${chalk.red(worst.function)} (score ${worst.complexity}) em ${chalk.dim(worst.file)}`);
  } else {
    console.log(`  ${chalk.green('✓')}  Complexidade ciclomática dentro do limite`);
  }

  if (analysis.circularDeps.hasCycles) {
    console.log(`  ${chalk.red('✗')}  ${analysis.circularDeps.cycles.length} dependência(s) circular(is) detectada(s)`);
    analysis.circularDeps.cycles.slice(0, 2).forEach((cycle) => {
      console.log(`     ${chalk.dim('→')} ${chalk.red(cycle.join(' → '))}`);
    });
  } else {
    console.log(`  ${chalk.green('✓')}  Sem dependências circulares`);
  }

  if (analysis.coupling.highCouplingFiles.length > 0) {
    console.log(`  ${chalk.yellow('⚠')}  ${analysis.coupling.highCouplingFiles.length} arquivo(s) com acoplamento alto (>${15} imports)`);
  }

  if (analysis.modularity.issues.length > 0) {
    analysis.modularity.issues.forEach((issue) => {
      console.log(`  ${chalk.yellow('⚠')}  ${issue}`);
    });
  }

  // Recommendations
  if (score.recommendations.length > 0) {
    console.log('');
    console.log(chalk.dim('  ─────────────────────────────────────────'));
    console.log(chalk.bold('  RECOMENDAÇÕES'));
    console.log(chalk.dim('  ─────────────────────────────────────────'));
    console.log('');
    score.recommendations.forEach((rec, i) => {
      console.log(`  ${chalk.cyan(`${i + 1}.`)} ${rec}`);
    });
  }

  // Footer
  console.log('');
  console.log(chalk.dim('  ─────────────────────────────────────────'));
  console.log(`  ${chalk.dim('Análise aprofundada:')} ${chalk.cyan('few.company/radar')}`);
  console.log(chalk.dim('  ─────────────────────────────────────────'));
  console.log('');
}

function printBreakdownLine(label: string, value: number): void {
  const color = value >= 80 ? chalk.green : value >= 60 ? chalk.yellow : chalk.red;
  const bar = '█'.repeat(Math.round(value / 10));
  console.log(`  ${chalk.dim(label.padEnd(16))} ${color(bar.padEnd(10))} ${color(String(value))}`);
}
