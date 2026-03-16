"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeCoupling = analyzeCoupling;
const ts_morph_1 = require("ts-morph");
const path_1 = __importDefault(require("path"));
const HIGH_COUPLING_THRESHOLD = 15;
async function analyzeCoupling(projectPath) {
    const project = new ts_morph_1.Project({ skipAddingFilesFromTsConfig: true });
    project.addSourceFilesAtPaths([
        path_1.default.join(projectPath, '**/*.ts'),
        path_1.default.join(projectPath, '**/*.tsx'),
        `!${path_1.default.join(projectPath, '**/node_modules/**')}`,
        `!${path_1.default.join(projectPath, '**/dist/**')}`,
        `!${path_1.default.join(projectPath, '**/.next/**')}`,
    ]);
    const highCouplingFiles = [];
    let totalImports = 0;
    let fileCount = 0;
    for (const sourceFile of project.getSourceFiles()) {
        const imports = sourceFile.getImportDeclarations();
        const importCount = imports.length;
        const filePath = path_1.default.relative(projectPath, sourceFile.getFilePath());
        totalImports += importCount;
        fileCount++;
        if (importCount >= HIGH_COUPLING_THRESHOLD) {
            highCouplingFiles.push({ file: filePath, imports: importCount });
        }
    }
    highCouplingFiles.sort((a, b) => b.imports - a.imports);
    return {
        avgCoupling: fileCount > 0 ? Math.round(totalImports / fileCount) : 0,
        highCouplingFiles: highCouplingFiles.slice(0, 10),
    };
}
//# sourceMappingURL=couplingAnalyzer.js.map