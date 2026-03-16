import { ScanResult, ScoreResult } from '../types/index.js';

const API_BASE = process.env.ARCHRADAR_API ?? 'https://api.archradar.few.company';

export async function sendScanMetadata(
  token: string,
  scan: ScanResult,
  score: ScoreResult
): Promise<string[] | null> {
  const payload = {
    projectMetadata: {
      framework: scan.framework.framework,
      frameworkVersion: scan.framework.version,
      totalFiles: scan.files.totalFiles,
      avgLines: scan.files.avgLinesPerFile,
      criticalFilesCount: scan.files.criticalFiles.length,
      totalDeps: scan.dependencies.totalDeps,
      suspiciousDeps: scan.dependencies.suspiciousDeps,
      heavyDeps: scan.dependencies.heavyDeps,
      structurePattern: scan.structure.patternName,
      healthScore: score.health.score,
      grade: score.health.grade,
      riskLevel: score.risk.riskLevel,
    },
  };

  const res = await fetch(`${API_BASE}/scan/premium`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { insights: string[] };
  return data.insights ?? null;
}

export async function fetchHistory(token: string): Promise<unknown[]> {
  const res = await fetch(`${API_BASE}/scan/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as { history: unknown[] };
  return data.history ?? [];
}
