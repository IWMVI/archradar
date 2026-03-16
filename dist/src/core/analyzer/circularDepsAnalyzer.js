"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeCircularDeps = analyzeCircularDeps;
const ts_morph_1 = require("ts-morph");
const path_1 = __importDefault(require("path"));
function buildGraph(projectPath, project) {
    const graph = new Map();
    for (const sourceFile of project.getSourceFiles()) {
        const filePath = path_1.default.relative(projectPath, sourceFile.getFilePath());
        if (!graph.has(filePath))
            graph.set(filePath, new Set());
        for (const imp of sourceFile.getImportDeclarations()) {
            const moduleSpec = imp.getModuleSpecifierValue();
            if (!moduleSpec.startsWith('.'))
                continue; // skip node_modules
            const resolved = imp.getModuleSpecifierSourceFile();
            if (!resolved)
                continue;
            const resolvedPath = path_1.default.relative(projectPath, resolved.getFilePath());
            graph.get(filePath).add(resolvedPath);
        }
    }
    return graph;
}
function detectCycles(graph) {
    const cycles = [];
    const visited = new Set();
    const stack = new Set();
    const stackArr = [];
    function dfs(node) {
        if (stack.has(node)) {
            const cycleStart = stackArr.indexOf(node);
            cycles.push([...stackArr.slice(cycleStart), node]);
            return;
        }
        if (visited.has(node))
            return;
        visited.add(node);
        stack.add(node);
        stackArr.push(node);
        for (const neighbor of graph.get(node) ?? []) {
            dfs(neighbor);
        }
        stack.delete(node);
        stackArr.pop();
    }
    for (const node of graph.keys()) {
        dfs(node);
    }
    // deduplicate cycles
    const seen = new Set();
    return cycles.filter((c) => {
        const key = [...c].sort().join('|');
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
async function analyzeCircularDeps(projectPath) {
    const project = new ts_morph_1.Project({ skipAddingFilesFromTsConfig: true });
    project.addSourceFilesAtPaths([
        path_1.default.join(projectPath, '**/*.ts'),
        path_1.default.join(projectPath, '**/*.tsx'),
        `!${path_1.default.join(projectPath, '**/node_modules/**')}`,
        `!${path_1.default.join(projectPath, '**/dist/**')}`,
        `!${path_1.default.join(projectPath, '**/.next/**')}`,
    ]);
    const graph = buildGraph(projectPath, project);
    const cycles = detectCycles(graph);
    return {
        hasCycles: cycles.length > 0,
        cycles: cycles.slice(0, 10),
    };
}
//# sourceMappingURL=circularDepsAnalyzer.js.map