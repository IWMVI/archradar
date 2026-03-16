"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanStructure = scanStructure;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const KNOWN_PATTERNS = [
    { name: 'Feature-based', required: ['features', 'modules'] },
    { name: 'Next.js App Router', required: ['app'] },
    { name: 'Next.js Pages Router', required: ['pages'] },
    { name: 'Classic MVC', required: ['components', 'services', 'hooks'] },
    { name: 'Domain-driven', required: ['domain', 'infrastructure', 'application'] },
];
async function listDirs(dirPath, depth, maxDepth) {
    if (depth > maxDepth)
        return [];
    const entries = await promises_1.default.readdir(dirPath, { withFileTypes: true }).catch(() => []);
    const dirs = [];
    for (const entry of entries) {
        if (!entry.isDirectory())
            continue;
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist')
            continue;
        const fullPath = path_1.default.join(dirPath, entry.name);
        dirs.push(entry.name);
        const children = await listDirs(fullPath, depth + 1, maxDepth);
        dirs.push(...children.map((c) => `${entry.name}/${c}`));
    }
    return dirs;
}
async function scanStructure(projectPath) {
    const folders = await listDirs(projectPath, 0, 3);
    const topLevel = folders.filter((f) => !f.includes('/'));
    let patternName = 'Unrecognized';
    let hasRecognizedPattern = false;
    for (const { name, required } of KNOWN_PATTERNS) {
        if (required.every((r) => topLevel.includes(r))) {
            patternName = name;
            hasRecognizedPattern = true;
            break;
        }
    }
    // Partial match — at least 2 of common dirs
    if (!hasRecognizedPattern) {
        const commonDirs = ['components', 'pages', 'hooks', 'utils', 'services', 'store', 'lib', 'api', 'app'];
        const found = topLevel.filter((f) => commonDirs.includes(f));
        if (found.length >= 2) {
            hasRecognizedPattern = true;
            patternName = 'Partial structure';
        }
    }
    return { folders: topLevel, hasRecognizedPattern, patternName };
}
//# sourceMappingURL=structureScanner.js.map