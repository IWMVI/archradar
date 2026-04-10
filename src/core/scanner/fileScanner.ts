import fg from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import { FileScanResult, FileInfo } from '../../types/index.js';
import { IGNORE_PATTERNS, THRESHOLDS } from '../../utils/validation.js';

async function scanFilesByPattern(
  projectPath: string,
  patterns: string[],
  ignorePatterns: string[],
  criticalThreshold: number
): Promise<FileScanResult> {
  const files = await fg(patterns, {
    cwd: projectPath,
    ignore: ignorePatterns,
    absolute: true,
  });

  if (files.length === 0) {
    return { totalFiles: 0, avgLinesPerFile: 0, criticalFiles: [] };
  }

  const fileInfos: FileInfo[] = [];
  let totalLines = 0;

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').length;
      const stats = await fs.stat(filePath);
      fileInfos.push({ path: path.relative(projectPath, filePath), lines, sizeBytes: stats.size });
      totalLines += lines;
    } catch (error) {
      console.warn(`Warning: Could not read ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const criticalFiles = fileInfos
    .filter((f) => f.lines > criticalThreshold)
    .sort((a, b) => b.lines - a.lines);

  return {
    totalFiles: fileInfos.length,
    avgLinesPerFile: Math.round(totalLines / fileInfos.length),
    criticalFiles,
  };
}

export async function scanFiles(projectPath: string): Promise<FileScanResult> {
  return scanFilesByPattern(
    projectPath,
    ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.vue', '**/*.svelte'],
    IGNORE_PATTERNS.JS,
    THRESHOLDS.FILE_SIZE.JS_CRITICAL
  );
}

export async function scanJavaFiles(projectPath: string): Promise<FileScanResult> {
  return scanFilesByPattern(
    projectPath,
    ['**/*.java', '**/*.kt', '**/*.kts'],
    IGNORE_PATTERNS.JAVA,
    THRESHOLDS.FILE_SIZE.JAVA_CRITICAL
  );
}
