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
    CRITICAL_HIGH: 15,
    CRITICAL_MEDIUM: 10,
    CRITICAL_LOW: 7,
    CRITICAL_VERY_LOW: 5,
  },
  FILE_SIZE: {
    JS_CRITICAL: 300,
    JAVA_CRITICAL: 500,
    JS_AVG_TARGET: 200,
    JAVA_AVG_TARGET: 300,
    AVG_EXCELLENT: 150,
    AVG_GOOD: 250,
    AVG_MODERATE: 400,
    AVG_WARNING: 600,
  },
  COUPLING: {
    JAVA_HIGH: 10,
    JS_HIGH: 15,
    JAVA_CRITICAL_HIGH: 12,
    JAVA_CRITICAL_VERY_HIGH: 18,
    JAVA_CRITICAL_EXTREME: 25,
    JS_CRITICAL_HIGH: 15,
    JS_CRITICAL_VERY_HIGH: 20,
  },
  GOD_CLASS_LINES: 1000,
  MAX_FILES_IN_MEMORY: 10000,
  PROJECT_SIZE: {
    JS_WARNING: 300,
    JAVA_WARNING: 500,
  },
  RATIO: {
    CRITICAL_EXCELLENT: 0,
    CRITICAL_GOOD: 0.03,
    CRITICAL_MODERATE: 0.10,
    CRITICAL_WARNING: 0.20,
  },
  SCORE: {
    EXCELLENT: 100,
    GOOD: 80,
    MODERATE: 60,
    WARNING: 40,
    CRITICAL: 20,
  },
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
