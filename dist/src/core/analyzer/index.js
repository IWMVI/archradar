"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const complexityAnalyzer_js_1 = require("./complexityAnalyzer.js");
const couplingAnalyzer_js_1 = require("./couplingAnalyzer.js");
const circularDepsAnalyzer_js_1 = require("./circularDepsAnalyzer.js");
const modularityAnalyzer_js_1 = require("./modularityAnalyzer.js");
async function run(projectPath) {
    const [complexity, coupling, circularDeps, modularity] = await Promise.all([
        (0, complexityAnalyzer_js_1.analyzeComplexity)(projectPath),
        (0, couplingAnalyzer_js_1.analyzeCoupling)(projectPath),
        (0, circularDepsAnalyzer_js_1.analyzeCircularDeps)(projectPath),
        (0, modularityAnalyzer_js_1.analyzeModularity)(projectPath),
    ]);
    return { complexity, coupling, circularDeps, modularity };
}
//# sourceMappingURL=index.js.map