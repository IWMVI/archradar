"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanDependencies = scanDependencies;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
// Groups of libs that serve the same purpose — having 2+ is suspicious
const OVERLAP_GROUPS = {
    'state-management': ['redux', 'zustand', 'jotai', 'recoil', 'mobx', 'valtio', 'pinia', '@ngrx/store'],
    'http-client': ['axios', 'ky', 'got', 'node-fetch', 'superagent', 'wretch'],
    'styling': ['styled-components', '@emotion/react', 'linaria', 'vanilla-extract', 'stitches'],
    'forms': ['react-hook-form', 'formik', 'final-form', 'vee-validate'],
    'date': ['moment', 'dayjs', 'date-fns', 'luxon'],
    'testing': ['jest', 'vitest', 'mocha', 'jasmine'],
};
const HEAVY_DEPS = ['moment', 'lodash', 'jquery', 'rxjs', '@mui/material', 'antd', 'semantic-ui-react'];
async function scanDependencies(projectPath) {
    const pkgPath = path_1.default.join(projectPath, 'package.json');
    try {
        const raw = await promises_1.default.readFile(pkgPath, 'utf-8');
        const pkg = JSON.parse(raw);
        const deps = { ...pkg.dependencies };
        const devDeps = { ...pkg.devDependencies };
        const allDeps = { ...deps, ...devDeps };
        const depKeys = Object.keys(allDeps);
        const suspiciousDeps = [];
        for (const [group, libs] of Object.entries(OVERLAP_GROUPS)) {
            const found = depKeys.filter((d) => libs.includes(d));
            if (found.length > 1) {
                suspiciousDeps.push(`Múltiplas libs de ${group}: ${found.join(', ')}`);
            }
        }
        const heavyDeps = depKeys.filter((d) => HEAVY_DEPS.includes(d));
        return {
            totalDeps: depKeys.length,
            suspiciousDeps,
            heavyDeps,
        };
    }
    catch {
        return { totalDeps: 0, suspiciousDeps: [], heavyDeps: [] };
    }
}
//# sourceMappingURL=dependencyScanner.js.map