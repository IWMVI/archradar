import { analyzeComplexity } from './complexityAnalyzer.js';
import { analyzeCoupling } from './couplingAnalyzer.js';
import { analyzeCircularDeps } from './circularDepsAnalyzer.js';
import { analyzeModularity } from './modularityAnalyzer.js';
import * as JavaAnalyzers from './java/index.js';
import { AnalysisResult, JavaAnalysisResult, ProjectType } from '../../types/index.js';

export async function run(projectPath: string, projectType: ProjectType = 'javascript'): Promise<AnalysisResult | JavaAnalysisResult> {
  if (projectType === 'java-spring') {
    return JavaAnalyzers.run(projectPath) as Promise<JavaAnalysisResult>;
  }

  const [complexity, coupling, circularDeps, modularity] = await Promise.all([
    analyzeComplexity(projectPath),
    analyzeCoupling(projectPath),
    analyzeCircularDeps(projectPath),
    analyzeModularity(projectPath),
  ]);

  return { complexity, coupling, circularDeps, modularity };
}

export { analyzeComplexity, analyzeCoupling, analyzeCircularDeps, analyzeModularity };
export * as JavaAnalyzers from './java/index.js';
