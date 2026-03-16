"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeModularity = analyzeModularity;
const ts_morph_1 = require("ts-morph");
const path_1 = __importDefault(require("path"));
// Heuristics: UI files should not import from service/api layers directly in large numbers
const UI_PATTERNS = ['/components/', '/pages/', '/app/', '/views/'];
const LOGIC_PATTERNS = ['/services/', '/api/', '/store/', '/domain/', '/application/'];
const HOOK_PATTERNS = ['/hooks/', '/composables/'];
function isUiFile(filePath) {
    return UI_PATTERNS.some((p) => filePath.includes(p));
}
function isLogicFile(filePath) {
    return LOGIC_PATTERNS.some((p) => filePath.includes(p));
}
function isHookFile(filePath) {
    return HOOK_PATTERNS.some((p) => filePath.includes(p));
}
async function analyzeModularity(projectPath) {
    const project = new ts_morph_1.Project({ skipAddingFilesFromTsConfig: true });
    project.addSourceFilesAtPaths([
        path_1.default.join(projectPath, '**/*.ts'),
        path_1.default.join(projectPath, '**/*.tsx'),
        `!${path_1.default.join(projectPath, '**/node_modules/**')}`,
        `!${path_1.default.join(projectPath, '**/dist/**')}`,
        `!${path_1.default.join(projectPath, '**/.next/**')}`,
    ]);
    const issues = [];
    let uiImportingLogicDirectly = 0;
    let hooksImportingUi = 0;
    let totalUiFiles = 0;
    let totalHookFiles = 0;
    for (const sourceFile of project.getSourceFiles()) {
        const filePath = path_1.default.relative(projectPath, sourceFile.getFilePath()).replace(/\\/g, '/');
        const localImports = sourceFile
            .getImportDeclarations()
            .map((i) => i.getModuleSpecifierSourceFile()?.getFilePath() ?? '')
            .filter(Boolean)
            .map((p) => path_1.default.relative(projectPath, p).replace(/\\/g, '/'));
        if (isUiFile(filePath)) {
            totalUiFiles++;
            const directLogicImports = localImports.filter(isLogicFile);
            if (directLogicImports.length > 3) {
                uiImportingLogicDirectly++;
            }
        }
        if (isHookFile(filePath)) {
            totalHookFiles++;
            const uiImports = localImports.filter(isUiFile);
            if (uiImports.length > 0) {
                hooksImportingUi++;
            }
        }
    }
    if (uiImportingLogicDirectly > 0) {
        issues.push(`${uiImportingLogicDirectly} arquivo(s) de UI importam serviços/store diretamente (>3 imports). Use hooks como intermediários.`);
    }
    if (hooksImportingUi > 0) {
        issues.push(`${hooksImportingUi} hook(s) importam componentes de UI — inversão de dependência. Hooks não devem depender de UI.`);
    }
    // Score: start at 100, deduct per issue ratio
    let score = 100;
    if (totalUiFiles > 0)
        score -= Math.min(40, (uiImportingLogicDirectly / totalUiFiles) * 100);
    if (totalHookFiles > 0)
        score -= Math.min(30, (hooksImportingUi / totalHookFiles) * 100);
    return {
        modularityScore: Math.round(Math.max(0, score)),
        issues,
    };
}
//# sourceMappingURL=modularityAnalyzer.js.map