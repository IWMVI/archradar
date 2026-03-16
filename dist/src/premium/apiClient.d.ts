import { ScanResult, ScoreResult } from '../types/index.js';
export declare function sendScanMetadata(token: string, scan: ScanResult, score: ScoreResult): Promise<string[] | null>;
export declare function fetchHistory(token: string): Promise<unknown[]>;
//# sourceMappingURL=apiClient.d.ts.map