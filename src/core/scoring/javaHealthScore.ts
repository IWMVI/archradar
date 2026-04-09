import { ScanResult, JavaAnalysisResult, HealthScore, Grade, ScoreBreakdown } from '../../types/index.js';
import { THRESHOLDS } from '../../utils/validation.js';

function scoreFileSize(avgLines: number): number {
  const t = THRESHOLDS.FILE_SIZE;
  if (avgLines <= t.AVG_EXCELLENT) return THRESHOLDS.SCORE.EXCELLENT;
  if (avgLines <= t.AVG_GOOD) return THRESHOLDS.SCORE.GOOD;
  if (avgLines <= t.AVG_MODERATE) return THRESHOLDS.SCORE.MODERATE;
  if (avgLines <= t.AVG_WARNING) return THRESHOLDS.SCORE.WARNING;
  return THRESHOLDS.SCORE.CRITICAL;
}

function scoreCriticalFiles(criticalCount: number, totalFiles: number): number {
  if (totalFiles === 0) return THRESHOLDS.SCORE.EXCELLENT;
  const ratio = criticalCount / totalFiles;
  const r = THRESHOLDS.RATIO;
  if (ratio === r.CRITICAL_EXCELLENT) return THRESHOLDS.SCORE.EXCELLENT;
  if (ratio <= r.CRITICAL_GOOD) return 80;
  if (ratio <= r.CRITICAL_MODERATE) return THRESHOLDS.SCORE.MODERATE;
  if (ratio <= r.CRITICAL_WARNING) return THRESHOLDS.SCORE.WARNING;
  return THRESHOLDS.SCORE.CRITICAL;
}

function scoreStructure(hasRecognizedPattern: boolean, folderCount: number): number {
  if (hasRecognizedPattern) return folderCount >= 4 ? THRESHOLDS.SCORE.EXCELLENT : 80;
  return folderCount >= 3 ? 40 : THRESHOLDS.SCORE.CRITICAL;
}

function scoreDependencies(suspicious: number, heavy: number): number {
  let score = THRESHOLDS.SCORE.EXCELLENT;
  score -= suspicious * 15;
  score -= Math.min(30, heavy * 3);
  return Math.max(0, score);
}

function scoreCoupling(avgCoupling: number): number {
  const t = THRESHOLDS.COUPLING;
  if (avgCoupling <= 8) return THRESHOLDS.SCORE.EXCELLENT;
  if (avgCoupling <= t.JAVA_CRITICAL_HIGH) return THRESHOLDS.SCORE.GOOD;
  if (avgCoupling <= t.JAVA_CRITICAL_VERY_HIGH) return THRESHOLDS.SCORE.MODERATE;
  if (avgCoupling <= t.JAVA_CRITICAL_EXTREME) return THRESHOLDS.SCORE.WARNING;
  return THRESHOLDS.SCORE.CRITICAL;
}

function scoreComplexity(avgComplexity: number, hotspotsCount: number): number {
  const t = THRESHOLDS.COMPLEXITY;
  let score = THRESHOLDS.SCORE.EXCELLENT;
  if (avgComplexity > t.CRITICAL_HIGH) score -= 40;
  else if (avgComplexity > t.CRITICAL_MEDIUM) score -= 25;
  else if (avgComplexity > t.CRITICAL_LOW) score -= 15;
  else if (avgComplexity > t.CRITICAL_VERY_LOW) score -= 10;
  score -= Math.min(35, hotspotsCount * 4);
  return Math.max(0, score);
}

function gradeFromScore(score: number): Grade {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function calculateJavaHealthScore(
  scan: ScanResult,
  analysis: JavaAnalysisResult
): { health: HealthScore; breakdown: ScoreBreakdown } {
  const fileSizeScore = scoreFileSize(scan.files.avgLinesPerFile);
  const criticalScore = scoreCriticalFiles(scan.files.criticalFiles.length, scan.files.totalFiles);
  const structureScore = scoreStructure(scan.structure.hasRecognizedPattern, scan.structure.folders.length);
  const depsScore = scoreDependencies(scan.dependencies.suspiciousDeps.length, scan.dependencies.heavyDeps.length);
  const couplingScore = scoreCoupling(analysis.coupling.avgCoupling);
  const complexityScore = scoreComplexity(analysis.complexity.avgComplexity, analysis.complexity.hotspots.length);
  const modScore = analysis.modularity.modularityScore;

  const score = Math.round(
    fileSizeScore * 0.12 +
    criticalScore * 0.13 +
    structureScore * 0.15 +
    depsScore * 0.15 +
    couplingScore * 0.15 +
    complexityScore * 0.15 +
    modScore * 0.15
  );

  return {
    health: { score, grade: gradeFromScore(score) },
    breakdown: {
      fileSize: fileSizeScore,
      criticalFiles: criticalScore,
      structure: structureScore,
      dependencies: depsScore,
      coupling: couplingScore,
      complexity: complexityScore,
      modularity: modScore,
    },
  };
}
