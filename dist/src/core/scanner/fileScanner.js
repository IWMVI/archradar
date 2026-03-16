"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanFiles = scanFiles;
const fast_glob_1 = __importDefault(require("fast-glob"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const CRITICAL_LINE_THRESHOLD = 300;
async function scanFiles(projectPath) {
    const patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.vue', '**/*.svelte'];
    const ignore = ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/build/**', '**/.nuxt/**'];
    const files = await (0, fast_glob_1.default)(patterns, {
        cwd: projectPath,
        ignore,
        absolute: true,
    });
    if (files.length === 0) {
        return { totalFiles: 0, avgLinesPerFile: 0, criticalFiles: [] };
    }
    const fileInfos = [];
    let totalLines = 0;
    for (const filePath of files) {
        try {
            const content = await promises_1.default.readFile(filePath, 'utf-8');
            const lines = content.split('\n').length;
            const stats = await promises_1.default.stat(filePath);
            fileInfos.push({ path: path_1.default.relative(projectPath, filePath), lines, sizeBytes: stats.size });
            totalLines += lines;
        }
        catch {
            // skip unreadable files
        }
    }
    const criticalFiles = fileInfos
        .filter((f) => f.lines > CRITICAL_LINE_THRESHOLD)
        .sort((a, b) => b.lines - a.lines);
    return {
        totalFiles: fileInfos.length,
        avgLinesPerFile: Math.round(totalLines / fileInfos.length),
        criticalFiles,
    };
}
//# sourceMappingURL=fileScanner.js.map