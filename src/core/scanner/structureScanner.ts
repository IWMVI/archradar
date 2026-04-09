import fs from 'fs/promises';
import path from 'path';
import { StructureScanResult, SpringLayerInfo } from '../../types/index.js';

const KNOWN_PATTERNS: Array<{ name: string; required: string[] }> = [
  { name: 'Feature-based', required: ['features', 'modules'] },
  { name: 'Next.js App Router', required: ['app'] },
  { name: 'Next.js Pages Router', required: ['pages'] },
  { name: 'Classic MVC', required: ['components', 'services', 'hooks'] },
  { name: 'Domain-driven', required: ['domain', 'infrastructure', 'application'] },
];

const SPRING_PATTERNS: Array<{ name: string; required: string[]; description: string }> = [
  {
    name: 'Spring MVC (Layered)',
    required: ['controller', 'service', 'repository'],
    description: 'Classic layered architecture',
  },
  {
    name: 'Spring DDD',
    required: ['domain', 'application', 'infrastructure'],
    description: 'Domain-driven design structure',
  },
  {
    name: 'Spring Hexagonal',
    required: ['adapter', 'domain', 'port'],
    description: 'Ports and adapters architecture',
  },
  {
    name: 'Spring Modular',
    required: ['module', 'shared'],
    description: 'Modular monolith structure',
  },
  {
    name: 'Spring Clean Architecture',
    required: ['entrypoint', 'usecase', 'domain', 'driver', 'gateway'],
    description: 'Clean architecture layers',
  },
];

const JAVA_LAYER_FOLDERS: Record<keyof SpringLayerInfo, string[]> = {
  controllers: ['controller', 'controllers', 'web', 'api', 'rest', 'resource', 'endpoint'],
  services: ['service', 'services', 'business', 'domain', 'application'],
  repositories: ['repository', 'repositories', 'persistence', 'dao', 'mapper'],
  models: ['model', 'models', 'entity', 'entities', 'domain', 'dto', 'vo', 'valueobject'],
  configs: ['config', 'configuration', 'properties'],
};

async function listDirs(dirPath: string, depth: number, maxDepth: number): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true }).catch(() => []);
  const dirs: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'target' || entry.name === 'build' || entry.name === '.gradle') continue;
    const fullPath = path.join(dirPath, entry.name);
    dirs.push(entry.name);
    if (depth < maxDepth) {
      const children = await listDirs(fullPath, depth + 1, maxDepth);
      dirs.push(...children.map((c) => `${entry.name}/${c}`));
    }
  }

  return dirs;
}

export async function scanStructure(projectPath: string): Promise<StructureScanResult> {
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

export async function scanJavaStructure(projectPath: string): Promise<StructureScanResult & { springInfo?: SpringLayerInfo }> {
  const folders = await listDirs(projectPath, 0, 7);
  const topLevel = folders.filter((f) => !f.includes('/'));
  const allFolders = folders;

  let patternName = 'Unrecognized';
  let hasRecognizedPattern = false;

  const normalizedFolders = folders.map((f) => f.toLowerCase());

  for (const { name, required } of SPRING_PATTERNS) {
    if (required.every((r) => normalizedFolders.some((f) => f.includes(r.toLowerCase())))) {
      patternName = name;
      hasRecognizedPattern = true;
      break;
    }
  }

  if (!hasRecognizedPattern) {
    const javaCommonDirs = ['controller', 'controllers', 'service', 'services', 'repository', 'repositories', 'model', 'models', 'config', 'domain', 'application', 'infrastructure', 'adapter', 'port', 'dto', 'entity'];
    const found = normalizedFolders.filter((f) => javaCommonDirs.some((d) => f.includes(d)));
    if (found.length >= 3) {
      hasRecognizedPattern = true;
      patternName = 'Partial Java structure';
    }
  }

  const springInfo = detectSpringLayers(allFolders);

  return { folders: topLevel, hasRecognizedPattern, patternName, springInfo };
}

function detectSpringLayers(allFolders: string[]): SpringLayerInfo {
  const info: SpringLayerInfo = {
    controllers: [],
    services: [],
    repositories: [],
    models: [],
    configs: [],
  };

  for (const folder of allFolders) {
    const normalizedFolder = folder.toLowerCase();
    
    for (const [layer, patterns] of Object.entries(JAVA_LAYER_FOLDERS) as [keyof SpringLayerInfo, string[]][]) {
      if (patterns.some((p) => normalizedFolder.includes(p))) {
        info[layer].push(folder);
      }
    }
  }

  for (const layer of Object.keys(info) as (keyof SpringLayerInfo)[]) {
    info[layer] = [...new Set(info[layer])];
  }

  return info;
}
