import path from 'path';
import fs from 'fs/promises';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateProjectPath(projectPath: string): string {
  const resolvedPath = path.resolve(projectPath);

  if (!resolvedPath) {
    throw new ValidationError('Invalid project path provided');
  }

  return resolvedPath;
}

export async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function isReadable(dirPath: string): Promise<boolean> {
  try {
    await fs.access(dirPath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export const THRESHOLDS = {
  COMPLEXITY: {
    HOTSPOT: 15,
    JS_HOTSPOT: 10,
  },
  FILE_SIZE: {
    JS_CRITICAL: 300,
    JAVA_CRITICAL: 500,
    JS_AVG_TARGET: 200,
    JAVA_AVG_TARGET: 300,
  },
  COUPLING: {
    JAVA_HIGH: 10,
    JS_HIGH: 15,
  },
  GOD_CLASS_LINES: 1000,
  MAX_FILES_IN_MEMORY: 10000,
} as const;

export const IGNORE_PATTERNS = {
  JAVA: [
    '**/target/**',
    '**/build/**',
    '**/node_modules/**',
    '**/.gradle/**',
    '**/bin/**',
    '**/*.class',
  ],
  JS: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/build/**',
    '**/.nuxt/**',
  ],
};
