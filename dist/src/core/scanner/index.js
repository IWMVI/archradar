"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const fileScanner_js_1 = require("./fileScanner.js");
const frameworkDetector_js_1 = require("./frameworkDetector.js");
const dependencyScanner_js_1 = require("./dependencyScanner.js");
const structureScanner_js_1 = require("./structureScanner.js");
async function run(projectPath) {
    const [framework, files, dependencies, structure] = await Promise.all([
        (0, frameworkDetector_js_1.detectFramework)(projectPath),
        (0, fileScanner_js_1.scanFiles)(projectPath),
        (0, dependencyScanner_js_1.scanDependencies)(projectPath),
        (0, structureScanner_js_1.scanStructure)(projectPath),
    ]);
    return { projectPath, framework, files, dependencies, structure };
}
//# sourceMappingURL=index.js.map