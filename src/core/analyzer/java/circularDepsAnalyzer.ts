import Parser from 'tree-sitter';
import Java from 'tree-sitter-java';
import fg from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import { JavaCircularDepsResult } from '../../../types/index.js';

type PackageGraph = Map<string, Set<string>>;

const JAVA_PATTERNS = ['**/*.java'];
const IGNORE_PATTERNS = ['**/target/**', '**/build/**', '**/node_modules/**', '**/.gradle/**'];

function getPackageFromFile(filePath: string): string {
  const dir = path.dirname(filePath);
  const srcIndex = dir.indexOf('src');
  if (srcIndex !== -1) {
    return dir.slice(srcIndex).replace(/[/\\]src[/\\]/, '').replace(/[/\\]/g, '.');
  }
  return dir.replace(/[/\\]/g, '.').replace(/^\./, '');
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

function detectCycles(graph: PackageGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();
  const stackArr: string[] = [];

  function dfs(node: string): void {
    if (stack.has(node)) {
      const cycleStart = stackArr.indexOf(node);
      cycles.push([...stackArr.slice(cycleStart), node]);
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    stack.add(node);
    stackArr.push(node);

    for (const neighbor of graph.get(node) ?? []) {
      dfs(neighbor);
    }

    stack.delete(node);
    stackArr.pop();
  }

  for (const node of graph.keys()) {
    dfs(node);
  }

  const seen = new Set<string>();
  return cycles.filter((c) => {
    const key = [...c].sort().join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function analyzeJavaCircularDeps(projectPath: string): Promise<JavaCircularDepsResult> {
  const parser = new Parser();
  parser.setLanguage(Java);

  const files = await fg(JAVA_PATTERNS, { cwd: projectPath, ignore: IGNORE_PATTERNS, absolute: true });

  const packageGraph: PackageGraph = new Map();
  const fileToPackage = new Map<string, string>();
  const fileToClass = new Map<string, string>();

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(projectPath, filePath);

      const packageName = getPackageFromFile(relativePath);
      const classMatch = content.match(/(?:public\s+)?(?:class|interface|enum)\s+(\w+)/);
      const className = classMatch ? classMatch[1] : '';

      fileToPackage.set(relativePath, packageName);
      if (className) {
        fileToClass.set(relativePath, className);
      }

      if (!packageGraph.has(packageName)) {
        packageGraph.set(packageName, new Set());
      }

      const imports = extractImports(parser.parse(content).rootNode);

      for (const imp of imports) {
        for (const [otherFile, otherClass] of fileToClass.entries()) {
          if (otherClass === imp && otherFile !== relativePath) {
            const fromPackage = fileToPackage.get(relativePath) || '';
            const toPackage = fileToPackage.get(otherFile) || '';

            if (fromPackage !== toPackage) {
              packageGraph.get(fromPackage)?.add(toPackage);
            }
          }
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  const packageCycles = detectCycles(packageGraph);

  const resultCycles: Array<{ packagePath: string; files: string[] }> = packageCycles.slice(0, 10).map((cycle) => ({
    packagePath: cycle.join(' -> '),
    files: cycle
      .map((pkg) => [...fileToPackage.entries()].find(([, p]) => p === pkg)?.[0] || '')
      .filter(Boolean)
      .slice(0, 5),
  }));

  return {
    hasCycles: packageCycles.length > 0,
    cycles: resultCycles,
  };
}
