import Parser from 'tree-sitter';
import Java from 'tree-sitter-java';
import fg from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import { JavaCouplingResult } from '../../../types/index.js';
import { topK } from '../../../utils/topK.js';

const HIGH_COUPLING_THRESHOLD = 10;

export async function analyzeJavaCoupling(projectPath: string): Promise<JavaCouplingResult> {
  const parser = new Parser();
  parser.setLanguage(Java);

  const patterns = ['**/*.java'];
  const ignore = ['**/target/**', '**/build/**', '**/node_modules/**', '**/.gradle/**'];

  const files = await fg(patterns, {
    cwd: projectPath,
    ignore,
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

      let importCount = 0;
      let classCount = 0;

      function analyzeNode(node: Parser.SyntaxNode): void {
        if (node.type === 'import_declaration') {
          importCount++;
        }
        if (node.type === 'class_declaration' || node.type === 'interface_declaration' || node.type === 'enum_declaration') {
          classCount++;
        }
        for (const child of node.children) {
          analyzeNode(child);
        }
      }

      analyzeNode(tree.rootNode);

      totalImports += importCount;
      fileCount++;

      if (importCount >= HIGH_COUPLING_THRESHOLD) {
        const fileType = detectFileType(filePath);
        highCouplingFiles.push({ file: relativePath, imports: importCount, type: fileType });
      }
    } catch {
      // skip unreadable files
    }
  }

  const top10 = topK(highCouplingFiles, 10, (f) => f.imports);
  top10.sort((a, b) => b.imports - a.imports);

  return {
    avgCoupling: fileCount > 0 ? Math.round(totalImports / fileCount) : 0,
    highCouplingFiles: top10,
  };
}

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
