import { ScanResult, AnalysisResult, ScoreResult, ProjectType, JavaAnalysisResult } from '../../types/index.js';
import { calculateHealthScore } from './healthScore.js';
import { calculateJavaHealthScore } from './javaHealthScore.js';
import { calculateRisk } from './riskEngine.js';
import { generateRecommendations, generateJavaRecommendations } from './recommendations.js';

export function run(
  scan: ScanResult,
  analysis: AnalysisResult | JavaAnalysisResult,
  projectType: ProjectType = 'javascript'
): ScoreResult {
  if (projectType === 'java-spring') {
    const { health, breakdown } = calculateJavaHealthScore(scan, analysis as JavaAnalysisResult);
    const risk = calculateRisk(health.score);
    const recommendations = generateJavaRecommendations(scan, analysis as JavaAnalysisResult);
    return { health, risk, recommendations, breakdown };
  }

  const { health, breakdown } = calculateHealthScore(scan, analysis as AnalysisResult);
  const risk = calculateRisk(health.score);
  const recommendations = generateRecommendations(scan, analysis as AnalysisResult);

  return { health, risk, recommendations, breakdown };
}
