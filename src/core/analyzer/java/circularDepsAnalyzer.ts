import Parser from 'tree-sitter';
import Java from 'tree-sitter-java';
import fg from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import { JavaCircularDepsResult } from '../../../types/index.js';
import { IGNORE_PATTERNS } from '../../../utils/validation.js';
import { extractJavaImports, extractClassNames, extractPackageFromPath } from '../../../utils/javaUtils.js';

type PackageGraph = Map<string, Set<string>>;

const JAVA_PATTERNS = ['**/*.java'];
const IGNORE_PATTERNS_LIST = IGNORE_PATTERNS.JAVA;

const parser = new Parser();
parser.setLanguage(Java);

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

    const neighbors = graph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        dfs(neighbor);
      }
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

interface ParsedFile {
  path: string;
  packageName: string;
  classes: string[];
  imports: string[];
}

async function parseJavaFiles(projectPath: string): Promise<ParsedFile[]> {
  const files = await fg(JAVA_PATTERNS, {
    cwd: projectPath,
    ignore: IGNORE_PATTERNS_LIST,
    absolute: true,
  });

  const results: ParsedFile[] = [];

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const tree = parser.parse(content);
      const relativePath = path.relative(projectPath, filePath);

      results.push({
        path: relativePath,
        packageName: extractPackageFromPath(relativePath),
        classes: extractClassNames(content),
        imports: extractJavaImports(tree.rootNode),
      });
    } catch (error) {
      console.warn(`Warning: Could not parse ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return results;
}

function buildPackageGraph(files: ParsedFile[]): {
  graph: PackageGraph;
  fileToPackage: Map<string, string>;
  packageToFiles: Map<string, string[]>;
} {
  const graph: PackageGraph = new Map();
  const fileToPackage = new Map<string, string>();
  const packageToFiles = new Map<string, string[]>();

  const classToFile = new Map<string, string>();

  for (const file of files) {
    fileToPackage.set(file.path, file.packageName);

    if (!packageToFiles.has(file.packageName)) {
      packageToFiles.set(file.packageName, []);
    }
    packageToFiles.get(file.packageName)!.push(file.path);

    for (const cls of file.classes) {
      classToFile.set(cls, file.path);
    }

    if (!graph.has(file.packageName)) {
      graph.set(file.packageName, new Set());
    }
  }

  for (const file of files) {
    for (const imp of file.imports) {
      const className = imp.split('.').pop() || '';
      const targetFile = classToFile.get(className);

      if (targetFile && targetFile !== file.path) {
        const fromPackage = fileToPackage.get(file.path) || '';
        const toPackage = fileToPackage.get(targetFile) || '';

        if (fromPackage !== toPackage && graph.has(fromPackage)) {
          graph.get(fromPackage)!.add(toPackage);
        }
      }
    }
  }

  return { graph, fileToPackage, packageToFiles };
}

export async function analyzeJavaCircularDeps(projectPath: string): Promise<JavaCircularDepsResult> {
  try {
    const files = await parseJavaFiles(projectPath);

    if (files.length === 0) {
      return { hasCycles: false, cycles: [] };
    }

    const { graph, fileToPackage, packageToFiles } = buildPackageGraph(files);
    const packageCycles = detectCycles(graph);

    const resultCycles: Array<{ packagePath: string; files: string[] }> = packageCycles
      .slice(0, 10)
      .map((cycle) => ({
        packagePath: cycle.join(' -> '),
        files: cycle
          .map((pkg) => packageToFiles.get(pkg)?.[0] || '')
          .filter(Boolean)
          .slice(0, 5),
      }));

    return {
      hasCycles: packageCycles.length > 0,
      cycles: resultCycles,
    };
  } catch (error) {
    console.warn(`Warning: Error analyzing circular dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { hasCycles: false, cycles: [] };
  }
}
