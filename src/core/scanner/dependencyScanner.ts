import { DependencyScanResult } from '../../types/index.js';
import { scanJavaDependencies } from './java/dependencyScanner.js';

const OVERLAP_GROUPS: Record<string, string[]> = {
  'state-management': ['redux', 'zustand', 'jotai', 'recoil', 'mobx', 'valtio', 'pinia', '@ngrx/store'],
  'http-client': ['axios', 'ky', 'got', 'node-fetch', 'superagent', 'wretch'],
  'styling': ['styled-components', '@emotion/react', 'linaria', 'vanilla-extract', 'stitches'],
  'forms': ['react-hook-form', 'formik', 'final-form', 'vee-validate'],
  'date': ['moment', 'dayjs', 'date-fns', 'luxon'],
  'testing': ['jest', 'vitest', 'mocha', 'jasmine'],
};

const HEAVY_DEPS = ['moment', 'lodash', 'jquery', 'rxjs', '@mui/material', 'antd', 'semantic-ui-react'];

export async function scanDependencies(projectPath: string): Promise<DependencyScanResult> {
  const pkgPath = `${projectPath}/package.json`;

  try {
    const fs = await import('fs/promises');
    const raw = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw);
    const deps: Record<string, string> = { ...pkg.dependencies };
    const devDeps: Record<string, string> = { ...pkg.devDependencies };
    const allDeps = { ...deps, ...devDeps };
    const depKeys = Object.keys(allDeps);

    const suspiciousDeps: string[] = [];
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
  } catch {
    return { totalDeps: 0, suspiciousDeps: [], heavyDeps: [] };
  }
}

export { scanJavaDependencies };
