import chalk from 'chalk';
import boxen from 'boxen';
import path from 'path';
import { ScanResult, JavaAnalysisResult, ScoreResult, JavaFrameworkInfo, RiskInfo } from '../../../types/index.js';

export function displayJava(scan: ScanResult, analysis: JavaAnalysisResult, score: ScoreResult): void {
  const projectName = path.basename(scan.projectPath);
  const javaFramework = scan.framework as JavaFrameworkInfo;

  const header = boxen(
    chalk.bold.white('ARCHRADAR') +
      chalk.gray(' — Architectural Intelligence\n') +
      chalk.dim('Java/Spring Boot Analysis'),
    {
      padding: { top: 0, bottom: 0, left: 2, right: 2 },
      borderStyle: 'round',
      borderColor: 'yellow',
    }
  );
  console.log('\n' + header);

  console.log('');
  console.log(`  ${chalk.dim('Project:')}   ${chalk.white.bold(projectName)}`);
  console.log(`  ${chalk.dim('Type:')}       ${chalk.yellow('Java/Spring Boot')}`);
  console.log(
    `  ${chalk.dim('Framework:')} ${chalk.white(javaFramework.framework)}${javaFramework.springVersion ? chalk.dim(' ' + javaFramework.springVersion) : ''}`
  );
  console.log(`  ${chalk.dim('Build:')}      ${chalk.white(javaFramework.buildTool?.toUpperCase() || 'Unknown')}`);
  if (javaFramework.javaVersion) {
    console.log(`  ${chalk.dim('Java:')}       ${chalk.white(javaFramework.javaVersion)}`);
  }
  console.log(`  ${chalk.dim('Classes:')}     ${chalk.white(scan.files.totalFiles.toString())}`);
  console.log(`  ${chalk.dim('Avg lines:')} ${chalk.white(scan.files.avgLinesPerFile.toString())}`);
  console.log(`  ${chalk.dim('Total deps:')}${chalk.white(' ' + scan.dependencies.totalDeps.toString())}`);

  console.log('');
  printSection('ARCHITECTURAL HEALTH SCORE');
  console.log('');
  printScoreBar(score.health.score);
  console.log('');
  printRiskLevel(score.risk);

  console.log('');
  printSection('BREAKDOWN');
  console.log('');
  const b = score.breakdown;
  printBreakdownLine('File size', b.fileSize);
  printBreakdownLine('Critical files', b.criticalFiles);
  printBreakdownLine('Structure', b.structure);
  printBreakdownLine('Dependencies', b.dependencies);
  printBreakdownLine('Coupling', b.coupling);
  printBreakdownLine('Complexity', b.complexity);
  printBreakdownLine('Modularity', b.modularity);

  console.log('');
  printSection('FINDINGS');
  console.log('');

  printCriticalFiles(scan);
  printDependencies(scan);
  printStructure(scan);
  printComplexityFindings(analysis);
  printCircularDeps(analysis);
  printCoupling(analysis);
  printModularityIssues(analysis);
  printRecommendations(score);

  printFooter();
}

function printSection(title: string): void {
  console.log(chalk.dim('  ─────────────────────────────────────────'));
  console.log(chalk.bold(`  ${title}`));
  console.log(chalk.dim('  ─────────────────────────────────────────'));
}

function printScoreBar(scoreValue: number): void {
  const filled = Math.round(scoreValue / 5);
  const empty = 20 - filled;
  const gradeColorFn = getGradeColor(getGrade(scoreValue));
  console.log(
    `  ${chalk.green('█'.repeat(filled))}${chalk.gray('░'.repeat(empty))}  ${chalk.bold.white(String(scoreValue))}${chalk.dim('/100')}  [${gradeColorFn(getGrade(scoreValue))}]`
  );
}

function getGrade(score: number): string {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function getGradeColor(grade: string): (s: string) => string {
  const map: Record<string, (s: string) => string> = {
    A: chalk.green,
    B: chalk.cyan,
    C: chalk.yellow,
    D: chalk.red,
    F: chalk.bgRed.white,
  };
  return map[grade] ?? chalk.white;
}

function printRiskLevel(risk: RiskInfo): void {
  const RISK_COLOR: Record<string, (s: string) => string> = {
    LOW: chalk.green,
    MEDIUM: chalk.yellow,
    HIGH: chalk.red,
    CRITICAL: chalk.bgRed.white,
  };
  const riskFn = RISK_COLOR[risk.riskLevel] ?? chalk.white;
  console.log(`  Risk Level: ${riskFn(risk.riskLevel)}`);
  console.log(`  ${chalk.dim(risk.riskDescription)}`);
}

function printBreakdownLine(label: string, value: number): void {
  const color = value >= 80 ? chalk.green : value >= 60 ? chalk.yellow : chalk.red;
  const bar = '█'.repeat(Math.round(value / 10));
  console.log(`  ${chalk.dim(label.padEnd(16))} ${color(bar.padEnd(10))} ${color(String(value))}`);
}

function printCriticalFiles(scan: ScanResult): void {
  if (scan.files.criticalFiles.length > 0) {
    console.log(`  ${chalk.yellow('⚠')}  ${scan.files.criticalFiles.length} critical class(es) (>500 lines)`);
    scan.files.criticalFiles.slice(0, 3).forEach((f) => {
      console.log(`     ${chalk.dim('→')} ${chalk.red(f.path)} ${chalk.dim(`(${f.lines} lines)`)}`);
    });
  } else {
    console.log(`  ${chalk.green('✓')}  No critical classes detected`);
  }
}

function printDependencies(scan: ScanResult): void {
  if (scan.dependencies.suspiciousDeps.length > 0) {
    scan.dependencies.suspiciousDeps.forEach((s) => {
      console.log(`  ${chalk.yellow('⚠')}  ${s}`);
    });
  } else {
    console.log(`  ${chalk.green('✓')}  No overlapping dependencies`);
  }

  if (scan.dependencies.heavyDeps.length > 0) {
    console.log(`  ${chalk.yellow('⚠')}  Heavy deps: ${chalk.red(scan.dependencies.heavyDeps.join(', '))}`);
  }
}

function printStructure(scan: ScanResult): void {
  if (scan.structure.hasRecognizedPattern) {
    console.log(`  ${chalk.green('✓')}  Recognized structure: ${chalk.cyan(scan.structure.patternName)}`);
  } else {
    console.log(`  ${chalk.yellow('⚠')}  No recognizable package structure`);
  }
}

function printComplexityFindings(analysis: JavaAnalysisResult): void {
  if (analysis.complexity.hotspots.length > 0) {
    const worst = analysis.complexity.hotspots[0];
    console.log(`  ${chalk.yellow('⚠')}  High complexity: ${chalk.red(worst.className + '.' + worst.method)} (score ${worst.complexity}) in ${chalk.dim(worst.file)}`);
  } else {
    console.log(`  ${chalk.green('✓')}  Cyclomatic complexity within threshold`);
  }
}

function printCircularDeps(analysis: JavaAnalysisResult): void {
  if (analysis.circularDeps.hasCycles) {
    console.log(`  ${chalk.red('✗')}  ${analysis.circularDeps.cycles.length} circular package dep(s) detected`);
    analysis.circularDeps.cycles.slice(0, 2).forEach((cycle) => {
      console.log(`     ${chalk.dim('→')} ${chalk.red(cycle.packagePath)}`);
    });
  } else {
    console.log(`  ${chalk.green('✓')}  No circular dependencies`);
  }
}

function printCoupling(analysis: JavaAnalysisResult): void {
  if (analysis.coupling.highCouplingFiles.length > 0) {
    console.log(`  ${chalk.yellow('⚠')}  ${analysis.coupling.highCouplingFiles.length} class(es) with high coupling (>${10} imports)`);
    analysis.coupling.highCouplingFiles.slice(0, 3).forEach((f) => {
      console.log(`     ${chalk.dim('→')} ${chalk.yellow(f.file)} ${chalk.dim(`(${f.type}, ${f.imports} imports)`)}`);
    });
  }
}

function printModularityIssues(analysis: JavaAnalysisResult): void {
  if (analysis.modularity.issues.length > 0) {
    analysis.modularity.issues.forEach((issue) => {
      console.log(`  ${chalk.yellow('⚠')}  ${issue}`);
    });
  } else {
    console.log(`  ${chalk.green('✓')}  Layer architecture respected`);
  }
}

function printRecommendations(score: ScoreResult): void {
  if (score.recommendations.length > 0) {
    console.log('');
    printSection('RECOMMENDATIONS');
    console.log('');
    score.recommendations.forEach((rec, i) => {
      console.log(`  ${chalk.cyan(`${i + 1}.`)} ${rec}`);
    });
  }
}

function printFooter(): void {
  console.log('');
  console.log(chalk.dim('  ─────────────────────────────────────────'));
  console.log(`  ${chalk.dim('Deep analysis:')} ${chalk.cyan('fewcompany.com/radar')}`);
  console.log(chalk.dim('  ─────────────────────────────────────────'));
  console.log('');
}
