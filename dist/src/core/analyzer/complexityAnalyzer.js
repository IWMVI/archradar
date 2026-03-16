"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeComplexity = analyzeComplexity;
const ts_morph_1 = require("ts-morph");
const path_1 = __importDefault(require("path"));
const COMPLEXITY_THRESHOLD = 10;
const COMPLEXITY_NODES = new Set([
    ts_morph_1.SyntaxKind.IfStatement,
    ts_morph_1.SyntaxKind.ElseKeyword,
    ts_morph_1.SyntaxKind.ForStatement,
    ts_morph_1.SyntaxKind.ForInStatement,
    ts_morph_1.SyntaxKind.ForOfStatement,
    ts_morph_1.SyntaxKind.WhileStatement,
    ts_morph_1.SyntaxKind.DoStatement,
    ts_morph_1.SyntaxKind.CaseClause,
    ts_morph_1.SyntaxKind.CatchClause,
    ts_morph_1.SyntaxKind.ConditionalExpression,
    ts_morph_1.SyntaxKind.AmpersandAmpersandToken,
    ts_morph_1.SyntaxKind.BarBarToken,
    ts_morph_1.SyntaxKind.QuestionQuestionToken,
]);
function countComplexity(node) {
    let count = 1; // base
    node.forEachDescendant((child) => {
        if (COMPLEXITY_NODES.has(child.getKind()))
            count++;
    });
    return count;
}
function getFunctionName(node) {
    if (ts_morph_1.Node.isFunctionDeclaration(node) || ts_morph_1.Node.isMethodDeclaration(node)) {
        return node.getName() ?? '<anonymous>';
    }
    if (ts_morph_1.Node.isVariableDeclaration(node))
        return node.getName();
    return '<anonymous>';
}
async function analyzeComplexity(projectPath) {
    const project = new ts_morph_1.Project({ skipAddingFilesFromTsConfig: true });
    project.addSourceFilesAtPaths([
        path_1.default.join(projectPath, '**/*.ts'),
        path_1.default.join(projectPath, '**/*.tsx'),
        `!${path_1.default.join(projectPath, '**/node_modules/**')}`,
        `!${path_1.default.join(projectPath, '**/dist/**')}`,
        `!${path_1.default.join(projectPath, '**/.next/**')}`,
    ]);
    const hotspots = [];
    let totalComplexity = 0;
    let functionCount = 0;
    for (const sourceFile of project.getSourceFiles()) {
        const filePath = path_1.default.relative(projectPath, sourceFile.getFilePath());
        const functions = [
            ...sourceFile.getFunctions(),
            ...sourceFile.getClasses().flatMap((c) => c.getMethods()),
            ...sourceFile
                .getVariableDeclarations()
                .filter((v) => ts_morph_1.Node.isArrowFunction(v.getInitializer()) ||
                ts_morph_1.Node.isFunctionExpression(v.getInitializer())),
        ];
        for (const fn of functions) {
            const complexity = countComplexity(fn);
            totalComplexity += complexity;
            functionCount++;
            if (complexity >= COMPLEXITY_THRESHOLD) {
                hotspots.push({
                    file: filePath,
                    function: getFunctionName(fn),
                    complexity,
                });
            }
        }
    }
    hotspots.sort((a, b) => b.complexity - a.complexity);
    return {
        avgComplexity: functionCount > 0 ? Math.round(totalComplexity / functionCount) : 0,
        hotspots: hotspots.slice(0, 10),
    };
}
//# sourceMappingURL=complexityAnalyzer.js.map