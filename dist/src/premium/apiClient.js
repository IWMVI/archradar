"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendScanMetadata = sendScanMetadata;
exports.fetchHistory = fetchHistory;
const API_BASE = process.env.ARCHRADAR_API ?? 'https://api.archradar.few.company';
async function sendScanMetadata(token, scan, score) {
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
    if (!res.ok)
        return null;
    const data = (await res.json());
    return data.insights ?? null;
}
async function fetchHistory(token) {
    const res = await fetch(`${API_BASE}/scan/history`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok)
        return [];
    const data = (await res.json());
    return data.history ?? [];
}
//# sourceMappingURL=apiClient.js.map