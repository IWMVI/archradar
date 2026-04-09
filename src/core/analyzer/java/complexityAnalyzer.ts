import Parser from 'tree-sitter';
import Java from 'tree-sitter-java';
import fg from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import { JavaComplexityResult } from '../../../types/index.js';
import { topK } from '../../../utils/topK.js';

const COMPLEXITY_THRESHOLD = 15;

const COMPLEXITY_NODE_TYPES = new Set([
  'if_statement',
  'else_clause',
  'for_statement',
  'for_in_statement',
  'enhanced_for_statement',
  'while_statement',
  'do_statement',
  'switch_statement',
  'case_statement',
  'catch_clause',
  'try_statement',
  'throw_statement',
  'conditional_expression',
  'binary_expression',
  'block',
]);

function countComplexity(node: Parser.SyntaxNode): number {
  let count = 1;
  
  function walk(n: Parser.SyntaxNode): void {
    if (COMPLEXITY_NODE_TYPES.has(n.type)) {
      count++;
    }
    for (const child of n.children) {
      walk(child);
    }
  }
  
  walk(node);
  return count;
}

function getMethodName(node: Parser.SyntaxNode): string {
  if (node.type === 'method_declaration') {
    const nameNode = node.childForFieldName('name');
    return nameNode?.text || '<anonymous>';
  }
  if (node.type === 'constructor_declaration') {
    const nameNode = node.childForFieldName('name');
    return nameNode?.text || '<init>';
  }
  return '<anonymous>';
}

function getClassName(node: Parser.SyntaxNode): string {
  let current: Parser.SyntaxNode | null = node;
  while (current) {
    if (current.type === 'class_declaration' || current.type === 'interface_declaration') {
      const nameNode = current.childForFieldName('name');
      return nameNode?.text || '<anonymous>';
    }
    current = current.parent;
  }
  return '<top-level>';
}

export async function analyzeJavaComplexity(projectPath: string): Promise<JavaComplexityResult> {
  const parser = new Parser();
  parser.setLanguage(Java);

  const patterns = ['**/*.java'];
  const ignore = ['**/target/**', '**/build/**', '**/node_modules/**', '**/.gradle/**'];

  const files = await fg(patterns, {
    cwd: projectPath,
    ignore,
    absolute: true,
  });

  const hotspots: Array<{ file: string; className: string; method: string; complexity: number }> = [];
  let totalComplexity = 0;
  let methodCount = 0;

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const tree = parser.parse(content);
      const relativePath = path.relative(projectPath, filePath);

      function analyzeNode(node: Parser.SyntaxNode): void {
        if (node.type === 'method_declaration' || node.type === 'constructor_declaration') {
          const className = getClassName(node);
          const methodName = getMethodName(node);
          const body = node.childForFieldName('body');
          
          if (body) {
            const complexity = countComplexity(body);
            totalComplexity += complexity;
            methodCount++;

            if (complexity >= COMPLEXITY_THRESHOLD) {
              hotspots.push({
                file: relativePath,
                className,
                method: methodName,
                complexity,
              });
            }
          }
        }

        for (const child of node.children) {
          analyzeNode(child);
        }
      }

      analyzeNode(tree.rootNode);
    } catch {
      // skip unreadable files
    }
  }

  const top10 = topK(hotspots, 10, (h) => h.complexity);
  top10.sort((a, b) => b.complexity - a.complexity);

  return {
    avgComplexity: methodCount > 0 ? Math.round(totalComplexity / methodCount) : 0,
    hotspots: top10,
  };
}
