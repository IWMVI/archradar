import { analyzeJavaComplexity } from './complexityAnalyzer.js';
import { analyzeJavaCoupling } from './couplingAnalyzer.js';
import { analyzeJavaCircularDeps } from './circularDepsAnalyzer.js';
import { analyzeJavaModularity } from './modularityAnalyzer.js';
import { JavaAnalysisResult } from '../../../types/index.js';

export async function run(projectPath: string): Promise<JavaAnalysisResult> {
  const [complexity, coupling, circularDeps, modularity] = await Promise.all([
    analyzeJavaComplexity(projectPath),
    analyzeJavaCoupling(projectPath),
    analyzeJavaCircularDeps(projectPath),
    analyzeJavaModularity(projectPath),
  ]);

  return { complexity, coupling, circularDeps, modularity };
}

export { analyzeJavaComplexity, analyzeJavaCoupling, analyzeJavaCircularDeps, analyzeJavaModularity };
