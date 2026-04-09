import Parser from 'tree-sitter';
import Java from 'tree-sitter-java';
import fg from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import { JavaCouplingResult } from '../../../types/index.js';
import { IGNORE_PATTERNS, THRESHOLDS } from '../../../utils/validation.js';
import { extractJavaImports } from '../../../utils/javaUtils.js';
import { topK } from '../../../utils/topK.js';

const FILE_TYPE_PATTERNS: Array<[pattern: RegExp, type: string]> = [
  [/[/\\]controller/i, 'Controller'],
  [/[/\\]service/i, 'Service'],
  [/[/\\]repository/i, 'Repository'],
  [/[/\\]entity/i, 'Entity'],
  [/[/\\]model/i, 'Model'],
  [/[/\\]dto/i, 'DTO'],
  [/[/\\](config|configuration)/i, 'Configuration'],
  [/[/\\]exception/i, 'Exception'],
];

function detectFileType(filePath: string): string {
  for (const [pattern, type] of FILE_TYPE_PATTERNS) {
    if (pattern.test(filePath)) {
      return type;
    }
  }
  return 'Other';
}

export async function analyzeJavaCoupling(projectPath: string): Promise<JavaCouplingResult> {
  const parser = new Parser();
  parser.setLanguage(Java);

  const files = await fg('**/*.java', {
    cwd: projectPath,
    ignore: IGNORE_PATTERNS.JAVA,
    absolute: true,
  });

  const highCouplingFiles: Array<{ file: string; imports: number; type: string }> = [];
  let totalImports = 0;
  let fileCount = 0;

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const tree = parser.parse(content);
      const relativePath = path.relative(projectPath, filePath);

      const imports = extractJavaImports(tree.rootNode);
      const importCount = imports.length;

      totalImports += importCount;
      fileCount++;

      if (importCount >= THRESHOLDS.COUPLING.JAVA_HIGH) {
        const fileType = detectFileType(filePath);
        highCouplingFiles.push({ file: relativePath, imports: importCount, type: fileType });
      }
    } catch (error) {
      console.warn(`Warning: Could not analyze ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const top10 = topK(highCouplingFiles, 10, (f) => f.imports);
  top10.sort((a, b) => b.imports - a.imports);

  return {
    avgCoupling: fileCount > 0 ? Math.round(totalImports / fileCount) : 0,
    highCouplingFiles: top10,
  };
}
