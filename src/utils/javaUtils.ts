import Parser from 'tree-sitter';
import path from 'path';

export function extractJavaImports(tree: Parser.SyntaxNode): string[] {
  const imports: string[] = [];

  function walk(node: Parser.SyntaxNode): void {
    if (node.type === 'import_declaration') {
      const qualifiedNode = node.childForFieldName('qualified_identifier');
      if (qualifiedNode) {
        imports.push(qualifiedNode.text);
      }
    }
    for (const child of node.children) {
      walk(child);
    }
  }

  walk(tree);
  return imports;
}

export function getJavaPackageName(tree: Parser.SyntaxNode): string {
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

export function extractClassNames(content: string): string[] {
  const classRegex = /(?:public\s+)?(?:class|interface|enum)\s+(\w+)/g;
  const classes: string[] = [];
  let match;

  while ((match = classRegex.exec(content)) !== null) {
    classes.push(match[1]);
  }

  return classes;
}

export function extractPackageFromPath(filePath: string): string {
  const dir = path.dirname(filePath);
  const srcIndex = dir.indexOf('src');

  if (srcIndex !== -1) {
    return dir.slice(srcIndex).replace(/[/\\]src[/\\]/, '').replace(/[/\\]/g, '.');
  }

  return dir.replace(/[/\\]/g, '.').replace(/^\./, '');
}
