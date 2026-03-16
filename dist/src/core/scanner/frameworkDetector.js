"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectFramework = detectFramework;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const FRAMEWORK_MAP = [
    { key: 'next', name: 'Next.js' },
    { key: 'nuxt', name: 'Nuxt' },
    { key: '@angular/core', name: 'Angular' },
    { key: 'react', name: 'React' },
    { key: 'vue', name: 'Vue' },
    { key: 'svelte', name: 'Svelte' },
    { key: 'solid-js', name: 'SolidJS' },
    { key: 'astro', name: 'Astro' },
    { key: 'remix', name: 'Remix' },
];
const BUNDLER_MAP = [
    { key: 'vite', name: 'Vite' },
    { key: 'webpack', name: 'Webpack' },
    { key: 'turbopack', name: 'Turbopack' },
    { key: 'parcel', name: 'Parcel' },
    { key: 'rollup', name: 'Rollup' },
    { key: 'esbuild', name: 'esbuild' },
];
async function detectFramework(projectPath) {
    const pkgPath = path_1.default.join(projectPath, 'package.json');
    try {
        const raw = await promises_1.default.readFile(pkgPath, 'utf-8');
        const pkg = JSON.parse(raw);
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        const depKeys = Object.keys(allDeps);
        let framework = 'Unknown';
        let version = '';
        for (const { key, name } of FRAMEWORK_MAP) {
            if (depKeys.includes(key)) {
                framework = name;
                version = allDeps[key]?.replace(/[\^~>=<]/g, '') ?? '';
                break;
            }
        }
        let bundler = 'Unknown';
        for (const { key, name } of BUNDLER_MAP) {
            if (depKeys.includes(key)) {
                bundler = name;
                break;
            }
        }
        // Next.js uses Turbopack/Webpack internally
        if (framework === 'Next.js' && bundler === 'Unknown')
            bundler = 'Webpack/Turbopack';
        return { framework, version, bundler };
    }
    catch {
        return { framework: 'Unknown', version: '', bundler: 'Unknown' };
    }
}
//# sourceMappingURL=frameworkDetector.js.map