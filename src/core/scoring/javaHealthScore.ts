import { ScanResult, JavaAnalysisResult, HealthScore, Grade, ScoreBreakdown } from '../../types/index.js';

function scoreFileSize(avgLines: number): number {
  if (avgLines <= 150) return 100;
  if (avgLines <= 250) return 80;
  if (avgLines <= 400) return 60;
  if (avgLines <= 600) return 40;
  return 20;
}

function scoreCriticalFiles(criticalCount: number, totalFiles: number): number {
  if (totalFiles === 0) return 100;
  const ratio = criticalCount / totalFiles;
  if (ratio === 0) return 100;
  if (ratio <= 0.03) return 80;
  if (ratio <= 0.10) return 60;
  if (ratio <= 0.20) return 40;
  return 20;
}

function scoreStructure(hasRecognizedPattern: boolean, folderCount: number): number {
  if (hasRecognizedPattern) return folderCount >= 4 ? 100 : 80;
  return folderCount >= 3 ? 40 : 20;
}

function scoreDependencies(suspicious: number, heavy: number): number {
  let score = 100;
  score -= suspicious * 15;
  score -= Math.min(30, heavy * 3);
  return Math.max(0, score);
}

function scoreCoupling(avgCoupling: number): number {
  if (avgCoupling <= 8) return 100;
  if (avgCoupling <= 12) return 80;
  if (avgCoupling <= 18) return 60;
  if (avgCoupling <= 25) return 40;
  return 20;
}

function scoreComplexity(avgComplexity: number, hotspotsCount: number): number {
  let score = 100;
  if (avgComplexity > 15) score -= 40;
  else if (avgComplexity > 10) score -= 25;
  else if (avgComplexity > 7) score -= 15;
  else if (avgComplexity > 5) score -= 10;
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
