import fs from 'fs/promises';
import path from 'path';
import fg from 'fast-glob';
import { FrameworkInfo, ProjectType, JavaFrameworkInfo } from '../../types/index.js';
import { IGNORE_PATTERNS } from '../../utils/validation.js';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const FRAMEWORK_MAP: Array<{ key: string; name: string }> = [
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

const BUNDLER_MAP: Array<{ key: string; name: string }> = [
  { key: 'vite', name: 'Vite' },
  { key: 'webpack', name: 'Webpack' },
  { key: 'turbopack', name: 'Turbopack' },
  { key: 'parcel', name: 'Parcel' },
  { key: 'rollup', name: 'Rollup' },
  { key: 'esbuild', name: 'esbuild' },
];

const SPRING_STARTER_PATTERNS: Array<{ pattern: string; name: string; category: string }> = [
  { pattern: 'spring-boot-starter-web', name: 'Spring Web (MVC)', category: 'web' },
  { pattern: 'spring-boot-starter-data-jpa', name: 'Spring Data JPA', category: 'data' },
  { pattern: 'spring-boot-starter-data-mongodb', name: 'Spring Data MongoDB', category: 'data' },
  { pattern: 'spring-boot-starter-data-redis', name: 'Spring Data Redis', category: 'data' },
  { pattern: 'spring-boot-starter-security', name: 'Spring Security', category: 'security' },
  { pattern: 'spring-boot-starter-test', name: 'Spring Test', category: 'testing' },
  { pattern: 'spring-boot-starter-validation', name: 'Spring Validation', category: 'web' },
  { pattern: 'spring-boot-starter-actuator', name: 'Spring Actuator', category: 'observability' },
  { pattern: 'spring-boot-starter-batch', name: 'Spring Batch', category: 'batch' },
  { pattern: 'spring-boot-starter-oauth2-client', name: 'Spring OAuth2 Client', category: 'security' },
  { pattern: 'spring-boot-starter-oauth2-resource-server', name: 'Spring OAuth2 Resource Server', category: 'security' },
  { pattern: 'spring-cloud-starter', name: 'Spring Cloud', category: 'cloud' },
  { pattern: 'spring-kafka', name: 'Spring Kafka', category: 'messaging' },
  { pattern: 'spring-rsocket', name: 'Spring RSocket', category: 'messaging' },
  { pattern: 'spring-boot-devtools', name: 'Spring DevTools', category: 'devtools' },
];

const COMPILED_SPRING_PATTERNS = SPRING_STARTER_PATTERNS.map(({ pattern }) => {
  const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`<artifactId>${escapedPattern}</artifactId>`);
});

export async function detectProjectType(projectPath: string): Promise<ProjectType> {
  const hasPomXml = await fileExists(path.join(projectPath, 'pom.xml'));
  const hasBuildGradle = await fileExists(path.join(projectPath, 'build.gradle'));
  const hasBuildGradleKts = await fileExists(path.join(projectPath, 'build.gradle.kts'));
  const hasPackageJson = await fileExists(path.join(projectPath, 'package.json'));

  if ((hasPomXml || hasBuildGradle || hasBuildGradleKts) && !hasPackageJson) {
    return 'java-spring';
  }

  if (hasPackageJson) {
    return 'javascript';
  }

  const javaFiles = await fg('**/*.java', {
    cwd: projectPath,
    ignore: IGNORE_PATTERNS.JAVA,
    absolute: true,
    onlyFiles: true,
  });

  if (javaFiles.length > 0) {
    return 'java-spring';
  }

  return 'javascript';
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function detectFramework(projectPath: string): Promise<FrameworkInfo> {
  const pkgPath = path.join(projectPath, 'package.json');

  try {
    const raw = await fs.readFile(pkgPath, 'utf-8');
    const pkg: PackageJson = JSON.parse(raw);
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

    if (framework === 'Next.js' && bundler === 'Unknown') bundler = 'Webpack/Turbopack';

    return { framework, version, bundler };
  } catch {
    return { framework: 'Unknown', version: '', bundler: 'Unknown' };
  }
}

export async function detectJavaFramework(
  projectPath: string
): Promise<JavaFrameworkInfo> {
  const pomPath = path.join(projectPath, 'pom.xml');
  const buildGradlePath = path.join(projectPath, 'build.gradle');
  const buildGradleKtsPath = path.join(projectPath, 'build.gradle.kts');

  if (await fileExists(pomPath)) {
    return analyzeMavenProject(pomPath);
  }

  if (await fileExists(buildGradlePath) || await fileExists(buildGradleKtsPath)) {
    const gradlePath = await fileExists(buildGradlePath) ? buildGradlePath : buildGradleKtsPath;
    return analyzeGradleProject(gradlePath);
  }

  return createUnknownJavaFrameworkInfo();
}

async function analyzeMavenProject(pomPath: string): Promise<JavaFrameworkInfo> {
  const pomContent = await fs.readFile(pomPath, 'utf-8');
  const springDeps = parseSpringDependencies(pomContent);

  const isSpring = springDeps.length > 0;
  const framework = isSpring ? 'Spring Boot' : 'Unknown';
  const bundler = 'Maven';
  const springVersion = extractPomVersion(pomContent);
  const javaVersion = extractJavaVersion(pomContent);

  return {
    framework,
    version: springVersion,
    bundler,
    buildTool: 'maven',
    springVersion,
    javaVersion,
  };
}

async function analyzeGradleProject(gradlePath: string): Promise<JavaFrameworkInfo> {
  const gradleContent = await fs.readFile(gradlePath, 'utf-8');
  const isSpring = /spring-boot-plugin|id\s+["']org\.springframework\.boot["']/i.test(gradleContent);
  const framework = isSpring ? 'Spring Boot' : 'Unknown';
  const springVersion = extractGradleSpringVersion(gradleContent);
  const javaVersion = extractGradleJavaVersion(gradleContent);

  return {
    framework,
    version: springVersion,
    bundler: 'Gradle',
    buildTool: 'gradle',
    springVersion,
    javaVersion,
  };
}

function extractPomVersion(content: string): string {
  const parentMatch = content.match(/<parent>[\s\S]*?<version>([\d.]+(?:M\d+)?(?:RC\d+)?(?:RELEASE)?-SNAPSHOT)?<\/version>/);
  return parentMatch?.[1] || '';
}

function extractJavaVersion(content: string): string {
  const javaMatch = content.match(/<java\.version>([^<]+)<\/java\.version>/);
  if (javaMatch) return javaMatch[1];
  const compilerMatch = content.match(/<maven\.compiler\.source>([^<]+)<\/maven\.compiler\.source>/);
  return compilerMatch?.[1] || '';
}

function extractGradleSpringVersion(content: string): string {
  const match = content.match(/springBoot\s*[\("']\s*["']?([\d.]+(?:M\d+)?(?:RC\d+)?)?["']?\s*[\)"]/i);
  return match?.[1] || '';
}

function extractGradleJavaVersion(content: string): string {
  const match = content.match(/sourceCompatibility\s*[=\(]\s*["']?(\d+[\d.]*)["']?/i);
  return match?.[1] || '';
}

function createUnknownJavaFrameworkInfo(): JavaFrameworkInfo {
  return {
    framework: 'Unknown',
    version: '',
    bundler: 'Unknown',
    buildTool: 'unknown',
    springVersion: '',
    javaVersion: '',
  };
}

function parseSpringDependencies(pomContent: string): string[] {
  const springDeps: string[] = [];
  
  for (let i = 0; i < SPRING_STARTER_PATTERNS.length; i++) {
    if (COMPILED_SPRING_PATTERNS[i].test(pomContent)) {
      springDeps.push(SPRING_STARTER_PATTERNS[i].pattern);
    }
  }
  
  return springDeps;
}
