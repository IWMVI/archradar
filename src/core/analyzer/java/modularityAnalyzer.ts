import Parser from 'tree-sitter';
import Java from 'tree-sitter-java';
import fg from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import { JavaModularityResult } from '../../../types/index.js';
import { IGNORE_PATTERNS, THRESHOLDS } from '../../../utils/validation.js';
import { extractJavaImports, getJavaPackageName } from '../../../utils/javaUtils.js';

const CONTROLLER_PATTERNS = ['controller', 'web', 'api', 'rest', 'resource'];
const SERVICE_PATTERNS = ['service', 'business'];
const DOMAIN_PATTERNS = ['domain', 'model', 'entity'];
const INFRASTRUCTURE_PATTERNS = ['infrastructure', 'persistence', 'adapter', 'repository', 'dao'];

type FileType = 'controller' | 'service' | 'domain' | 'other';

interface FileAnalysis {
  path: string;
  packageName: string;
  imports: string[];
  lineCount: number;
  fileType: FileType;
}

const parser = new Parser();
parser.setLanguage(Java);

function detectFileType(filePath: string): FileType {
  const normalized = filePath.toLowerCase();
  if (CONTROLLER_PATTERNS.some((p) => normalized.includes(p))) return 'controller';
  if (SERVICE_PATTERNS.some((p) => normalized.includes(p))) return 'service';
  if (DOMAIN_PATTERNS.some((p) => normalized.includes(p))) return 'domain';
  return 'other';
}

function hasImport(imports: string[], pattern: string): boolean {
  return imports.some((imp) => imp.toLowerCase().includes(pattern));
}

async function analyzeFiles(projectPath: string): Promise<FileAnalysis[]> {
  const files = await fg('**/*.java', {
    cwd: projectPath,
    ignore: IGNORE_PATTERNS.JAVA,
    absolute: true,
  });

  const analyses: FileAnalysis[] = [];

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const tree = parser.parse(content);

      analyses.push({
        path: path.relative(projectPath, filePath),
        packageName: getJavaPackageName(tree.rootNode),
        imports: extractJavaImports(tree.rootNode),
        lineCount: content.split('\n').length,
        fileType: detectFileType(filePath),
      });
    } catch (error) {
      console.warn(`Warning: Could not analyze ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return analyses;
}

interface Violations {
  controllersWithRepos: number;
  servicesWithControllers: number;
  domainsWithInfra: number;
  godClasses: number;
}

function detectViolations(analyses: FileAnalysis[]): Violations {
  const violations: Violations = {
    controllersWithRepos: 0,
    servicesWithControllers: 0,
    domainsWithInfra: 0,
    godClasses: 0,
  };

  for (const analysis of analyses) {
    const { imports, fileType, lineCount } = analysis;

    if (fileType === 'controller' && hasImport(imports, 'repository')) {
      violations.controllersWithRepos++;
    }

    if (fileType === 'service' && hasImport(imports, 'controller')) {
      violations.servicesWithControllers++;
    }

    if (fileType === 'domain' && INFRASTRUCTURE_PATTERNS.some((p) => hasImport(imports, p))) {
      violations.domainsWithInfra++;
    }

    if (lineCount > THRESHOLDS.GOD_CLASS_LINES) {
      violations.godClasses++;
    }
  }

  return violations;
}

function generateIssues(violations: Violations, totalControllers: number, totalServices: number, totalDomains: number): string[] {
  const issues: string[] = [];

  if (violations.controllersWithRepos > 0) {
    issues.push(
      `${violations.controllersWithRepos} controller(s) import repository/DAO directly. Use service layer as intermediary.`
    );
  }

  if (violations.servicesWithControllers > 0) {
    issues.push(
      `${violations.servicesWithControllers} service(s) import controllers. This violates dependency direction.`
    );
  }

  if (violations.domainsWithInfra > 0) {
    issues.push(
      `${violations.domainsWithInfra} domain class(es) import infrastructure. Domain layer should be isolated.`
    );
  }

  if (violations.godClasses > 0) {
    issues.push(
      `${violations.godClasses} class(es) exceed ${THRESHOLDS.GOD_CLASS_LINES} lines. Consider splitting into smaller, focused classes.`
    );
  }

  return issues;
}

function calculateScore(violations: Violations, totalControllers: number, totalServices: number, totalDomains: number): number {
  let score = 100;

  if (totalControllers > 0) {
    score -= Math.min(30, (violations.controllersWithRepos / totalControllers) * 100);
  }

  if (totalServices > 0) {
    score -= Math.min(25, (violations.servicesWithControllers / totalServices) * 100);
  }

  if (totalDomains > 0) {
    score -= Math.min(20, (violations.domainsWithInfra / totalDomains) * 100);
  }

  score -= Math.min(25, violations.godClasses * 10);

  return Math.round(Math.max(0, score));
}

export async function analyzeJavaModularity(projectPath: string): Promise<JavaModularityResult> {
  try {
    const analyses = await analyzeFiles(projectPath);

    if (analyses.length === 0) {
      return { modularityScore: 100, issues: [] };
    }

    const violations = detectViolations(analyses);

    const totalControllers = analyses.filter((a) => a.fileType === 'controller').length;
    const totalServices = analyses.filter((a) => a.fileType === 'service').length;
    const totalDomains = analyses.filter((a) => a.fileType === 'domain').length;

    const issues = generateIssues(violations, totalControllers, totalServices, totalDomains);
    const score = calculateScore(violations, totalControllers, totalServices, totalDomains);

    return { modularityScore: score, issues };
  } catch (error) {
    console.warn(`Warning: Error analyzing modularity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { modularityScore: 0, issues: ['Error analyzing modularity'] };
  }
}
