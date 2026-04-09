import { scanFiles, scanJavaFiles } from './fileScanner.js';
import { detectFramework, detectProjectType, detectJavaFramework } from './frameworkDetector.js';
import { scanDependencies, scanJavaDependencies } from './dependencyScanner.js';
import { scanStructure, scanJavaStructure } from './structureScanner.js';
import { ScanResult, JavaFrameworkInfo } from '../../types/index.js';

export interface JavaScanResult extends ScanResult {
  javaFramework?: JavaFrameworkInfo;
  javaDependencies?: {
    totalDeps: number;
    dependencies: Array<{
      groupId: string;
      artifactId: string;
      version: string;
      scope: string;
      category: string;
    }>;
    suspiciousDeps: string[];
    heavyDeps: string[];
    categories: Record<string, number>;
  };
}

export async function run(projectPath: string): Promise<ScanResult> {
  const projectType = await detectProjectType(projectPath);

  if (projectType === 'java-spring') {
    return runJavaScan(projectPath);
  }

  const [framework, files, dependencies, structure] = await Promise.all([
    detectFramework(projectPath),
    scanFiles(projectPath),
    scanDependencies(projectPath),
    scanStructure(projectPath),
  ]);

  return { projectPath, projectType, framework, files, dependencies, structure };
}

export async function runJavaScan(projectPath: string): Promise<ScanResult> {
  const [javaFramework, files, javaDeps, structure] = await Promise.all([
    detectJavaFramework(projectPath),
    scanJavaFiles(projectPath),
    scanJavaDependencies(projectPath),
    scanJavaStructure(projectPath),
  ]);

  const framework: JavaFrameworkInfo = {
    framework: javaFramework.framework,
    version: javaFramework.springVersion || javaFramework.version,
    bundler: javaFramework.buildTool,
    buildTool: javaFramework.buildTool,
    springVersion: javaFramework.springVersion,
    javaVersion: javaFramework.javaVersion,
  };

  const dependencies = {
    totalDeps: javaDeps.totalDeps,
    suspiciousDeps: javaDeps.suspiciousDeps,
    heavyDeps: javaDeps.heavyDeps,
  };

  return {
    projectPath,
    projectType: 'java-spring',
    framework,
    files,
    dependencies,
    structure,
  };
}

export { detectProjectType, detectFramework, detectJavaFramework } from './frameworkDetector.js';
export { scanDependencies, scanJavaDependencies } from './dependencyScanner.js';
export { scanFiles, scanJavaFiles } from './fileScanner.js';
export { scanStructure, scanJavaStructure } from './structureScanner.js';
