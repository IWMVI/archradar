"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.display = display;
const chalk_1 = __importDefault(require("chalk"));
const boxen_1 = __importDefault(require("boxen"));
const path_1 = __importDefault(require("path"));
const RISK_COLOR = {
    LOW: chalk_1.default.green,
    MEDIUM: chalk_1.default.yellow,
    HIGH: chalk_1.default.red,
    CRITICAL: chalk_1.default.bgRed.white,
};
function scoreBar(score) {
    const filled = Math.round(score / 5);
    const empty = 20 - filled;
    return chalk_1.default.green('█'.repeat(filled)) + chalk_1.default.gray('░'.repeat(empty));
}
function gradeColor(grade) {
    const map = {
        A: chalk_1.default.green,
        B: chalk_1.default.cyan,
        C: chalk_1.default.yellow,
        D: chalk_1.default.red,
        F: chalk_1.default.bgRed.white,
    };
    return (map[grade] ?? chalk_1.default.white)(grade);
}
function display(scan, analysis, score) {
    const projectName = path_1.default.basename(scan.projectPath);
    // Header
    const header = (0, boxen_1.default)(chalk_1.default.bold.white('ARCHRADAR') +
        chalk_1.default.gray(' — Architectural Intelligence\n') +
        chalk_1.default.dim('by Few Company'), {
        padding: { top: 0, bottom: 0, left: 2, right: 2 },
        borderStyle: 'round',
        borderColor: 'cyan',
    });
    console.log('\n' + header);
    // Project info
    console.log('');
    console.log(`  ${chalk_1.default.dim('Project:')}   ${chalk_1.default.white.bold(projectName)}`);
    console.log(`  ${chalk_1.default.dim('Framework:')} ${chalk_1.default.white(scan.framework.framework)}${scan.framework.version ? chalk_1.default.dim(' ' + scan.framework.version) : ''}`);
    console.log(`  ${chalk_1.default.dim('Bundler:')}   ${chalk_1.default.white(scan.framework.bundler)}`);
    console.log(`  ${chalk_1.default.dim('Files:')}     ${chalk_1.default.white(scan.files.totalFiles.toString())}`);
    console.log(`  ${chalk_1.default.dim('Avg lines:')} ${chalk_1.default.white(scan.files.avgLinesPerFile.toString())}`);
    console.log(`  ${chalk_1.default.dim('Total deps:')}${chalk_1.default.white(' ' + scan.dependencies.totalDeps.toString())}`);
    // Score
    console.log('');
    console.log(chalk_1.default.dim('  ─────────────────────────────────────────'));
    console.log(chalk_1.default.bold('  ARCHITECTURAL HEALTH SCORE'));
    console.log(chalk_1.default.dim('  ─────────────────────────────────────────'));
    console.log('');
    console.log(`  ${scoreBar(score.health.score)}  ${chalk_1.default.bold.white(String(score.health.score))}${chalk_1.default.dim('/100')}  [${gradeColor(score.health.grade)}]`);
    console.log('');
    const riskFn = RISK_COLOR[score.risk.riskLevel];
    console.log(`  Risk Level: ${riskFn(score.risk.riskLevel)}`);
    console.log(`  ${chalk_1.default.dim(score.risk.riskDescription)}`);
    // Score breakdown
    console.log('');
    console.log(chalk_1.default.dim('  ─────────────────────────────────────────'));
    console.log(chalk_1.default.bold('  BREAKDOWN'));
    console.log(chalk_1.default.dim('  ─────────────────────────────────────────'));
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
    console.log(chalk_1.default.dim('  ─────────────────────────────────────────'));
    console.log(chalk_1.default.bold('  FINDINGS'));
    console.log(chalk_1.default.dim('  ─────────────────────────────────────────'));
    console.log('');
    if (scan.files.criticalFiles.length > 0) {
        console.log(`  ${chalk_1.default.yellow('⚠')}  ${scan.files.criticalFiles.length} arquivo(s) crítico(s) (>300 linhas)`);
        scan.files.criticalFiles.slice(0, 3).forEach((f) => {
            console.log(`     ${chalk_1.default.dim('→')} ${chalk_1.default.red(f.path)} ${chalk_1.default.dim(`(${f.lines} linhas)`)}`);
        });
    }
    else {
        console.log(`  ${chalk_1.default.green('✓')}  Nenhum arquivo crítico detectado`);
    }
    if (scan.dependencies.suspiciousDeps.length > 0) {
        scan.dependencies.suspiciousDeps.forEach((s) => {
            console.log(`  ${chalk_1.default.yellow('⚠')}  ${s}`);
        });
    }
    else {
        console.log(`  ${chalk_1.default.green('✓')}  Dependências sem sobreposição`);
    }
    if (scan.dependencies.heavyDeps.length > 0) {
        console.log(`  ${chalk_1.default.yellow('⚠')}  Dependências pesadas: ${chalk_1.default.red(scan.dependencies.heavyDeps.join(', '))}`);
    }
    if (scan.structure.hasRecognizedPattern) {
        console.log(`  ${chalk_1.default.green('✓')}  Estrutura reconhecível: ${chalk_1.default.cyan(scan.structure.patternName)}`);
    }
    else {
        console.log(`  ${chalk_1.default.yellow('⚠')}  Estrutura de pastas sem padrão reconhecível`);
    }
    // AST findings
    if (analysis.complexity.hotspots.length > 0) {
        const worst = analysis.complexity.hotspots[0];
        console.log(`  ${chalk_1.default.yellow('⚠')}  Complexidade alta: ${chalk_1.default.red(worst.function)} (score ${worst.complexity}) em ${chalk_1.default.dim(worst.file)}`);
    }
    else {
        console.log(`  ${chalk_1.default.green('✓')}  Complexidade ciclomática dentro do limite`);
    }
    if (analysis.circularDeps.hasCycles) {
        console.log(`  ${chalk_1.default.red('✗')}  ${analysis.circularDeps.cycles.length} dependência(s) circular(is) detectada(s)`);
        analysis.circularDeps.cycles.slice(0, 2).forEach((cycle) => {
            console.log(`     ${chalk_1.default.dim('→')} ${chalk_1.default.red(cycle.join(' → '))}`);
        });
    }
    else {
        console.log(`  ${chalk_1.default.green('✓')}  Sem dependências circulares`);
    }
    if (analysis.coupling.highCouplingFiles.length > 0) {
        console.log(`  ${chalk_1.default.yellow('⚠')}  ${analysis.coupling.highCouplingFiles.length} arquivo(s) com acoplamento alto (>${15} imports)`);
    }
    if (analysis.modularity.issues.length > 0) {
        analysis.modularity.issues.forEach((issue) => {
            console.log(`  ${chalk_1.default.yellow('⚠')}  ${issue}`);
        });
    }
    // Recommendations
    if (score.recommendations.length > 0) {
        console.log('');
        console.log(chalk_1.default.dim('  ─────────────────────────────────────────'));
        console.log(chalk_1.default.bold('  RECOMENDAÇÕES'));
        console.log(chalk_1.default.dim('  ─────────────────────────────────────────'));
        console.log('');
        score.recommendations.forEach((rec, i) => {
            console.log(`  ${chalk_1.default.cyan(`${i + 1}.`)} ${rec}`);
        });
    }
    // Footer
    console.log('');
    console.log(chalk_1.default.dim('  ─────────────────────────────────────────'));
    console.log(`  ${chalk_1.default.dim('Análise aprofundada:')} ${chalk_1.default.cyan('few.company/radar')}`);
    console.log(chalk_1.default.dim('  ─────────────────────────────────────────'));
    console.log('');
}
function printBreakdownLine(label, value) {
    const color = value >= 80 ? chalk_1.default.green : value >= 60 ? chalk_1.default.yellow : chalk_1.default.red;
    const bar = '█'.repeat(Math.round(value / 10));
    console.log(`  ${chalk_1.default.dim(label.padEnd(16))} ${color(bar.padEnd(10))} ${color(String(value))}`);
}
//# sourceMappingURL=terminalReport.js.map