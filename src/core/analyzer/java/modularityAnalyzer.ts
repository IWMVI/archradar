import Parser from 'tree-sitter';
import Java from 'tree-sitter-java';
import fg from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import { JavaModularityResult } from '../../../types/index.js';

const CONTROLLER_PATTERNS = ['controller', 'web', 'api', 'rest', 'resource'];
const SERVICE_PATTERNS = ['service', 'business'];
const REPOSITORY_PATTERNS = ['repository', 'persistence', 'dao', 'mapper'];
const DOMAIN_PATTERNS = ['domain', 'model', 'entity'];
const INFRASTRUCTURE_PATTERNS = ['infrastructure', 'persistence', 'adapter', 'repository', 'dao'];

interface FileAnalysis {
  path: string;
  packageName: string;
  imports: Set<string>;
  lineCount: number;
  fileType: 'controller' | 'service' | 'domain' | 'other';
}

function detectFileType(filePath: string): FileAnalysis['fileType'] {
  const normalized = filePath.toLowerCase();
  if (CONTROLLER_PATTERNS.some((p) => normalized.includes(p))) return 'controller';
  if (SERVICE_PATTERNS.some((p) => normalized.includes(p))) return 'service';
  if (DOMAIN_PATTERNS.some((p) => normalized.includes(p))) return 'domain';
  return 'other';
}

function hasImport(imports: Set<string>, pattern: string): boolean {
  return [...imports].some((imp) => imp.toLowerCase().includes(pattern));
}

function extractImports(tree: Parser.SyntaxNode): Set<string> {
  const imports = new Set<string>();

  function walk(node: Parser.SyntaxNode): void {
    if (node.type === 'import_declaration') {
      const qualifiedNode = node.childForFieldName('qualified_identifier');
      if (qualifiedNode) {
        imports.add(qualifiedNode.text);
      }
    }
    for (const child of node.children) {
      walk(child);
    }
  }

  walk(tree);
  return imports;
}

function getPackageName(tree: Parser.SyntaxNode): string {
  function walk(node: Parser.SyntaxNode): string | null {
    if (node.type === 'package_declaration') {
      return node.childForFieldName('identifier')?.text || null;
    }
    for (const child of node.children) {
      const result = walk(child);
      if (result) return result;
    }
    return null;
  }
  return walk(tree) || '';
}

async function analyzeFiles(projectPath: string): Promise<FileAnalysis[]> {
  const parser = new Parser();
  parser.setLanguage(Java);

  const patterns = ['**/*.java'];
  const ignore = ['**/target/**', '**/build/**', '**/node_modules/**', '**/.gradle/**'];

  const files = await fg(patterns, { cwd: projectPath, ignore, absolute: true });
  const analyses: FileAnalysis[] = [];

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const tree = parser.parse(content);

      analyses.push({
        path: path.relative(projectPath, filePath),
        packageName: getPackageName(tree.rootNode),
        imports: extractImports(tree.rootNode),
        lineCount: content.split('\n').length,
        fileType: detectFileType(filePath),
      });
    } catch {
      // skip unreadable files
    }
  }

  return analyses;
}

function detectViolations(analyses: FileAnalysis[]): {
  controllersWithRepos: number;
  servicesWithControllers: number;
  domainsWithInfra: number;
  godClasses: number;
} {
  let controllersWithRepos = 0;
  let servicesWithControllers = 0;
  let domainsWithInfra = 0;
  let godClasses = 0;

  for (const analysis of analyses) {
    const { imports, fileType, lineCount } = analysis;

    if (fileType === 'controller' && hasImport(imports, 'repository')) {
      controllersWithRepos++;
    }

    if (fileType === 'service' && hasImport(imports, 'controller')) {
      servicesWithControllers++;
    }

    if (fileType === 'domain' && INFRASTRUCTURE_PATTERNS.some((p) => hasImport(imports, p))) {
      domainsWithInfra++;
    }

    if (lineCount > 1000) {
      godClasses++;
    }
  }

  return { controllersWithRepos, servicesWithControllers, domainsWithInfra, godClasses };
}

function generateIssues(
  violations: ReturnType<typeof detectViolations>,
  totalControllers: number,
  totalServices: number,
  totalDomains: number
): string[] {
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
      `${violations.godClasses} class(es) exceed 1000 lines. Consider splitting into smaller, focused classes.`
    );
  }

  return issues;
}

function calculateScore(
  violations: ReturnType<typeof detectViolations>,
  totalControllers: number,
  totalServices: number,
  totalDomains: number
): number {
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
  const analyses = await analyzeFiles(projectPath);

  const violations = detectViolations(analyses);

  const totalControllers = analyses.filter((a) => a.fileType === 'controller').length;
  const totalServices = analyses.filter((a) => a.fileType === 'service').length;
  const totalDomains = analyses.filter((a) => a.fileType === 'domain').length;

  const issues = generateIssues(violations, totalControllers, totalServices, totalDomains);
  const score = calculateScore(violations, totalControllers, totalServices, totalDomains);

  return {
    modularityScore: score,
    issues,
  };
}
