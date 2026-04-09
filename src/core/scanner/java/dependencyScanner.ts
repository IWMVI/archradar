import fs from 'fs/promises';
import path from 'path';
import { JavaDependencyInfo, DependencyCategory } from '../../../types/index.js';

export const JAVA_DEPENDENCY_CATEGORIES: Record<string, DependencyCategory> = {
  'spring-boot-starter-web': 'web',
  'spring-boot-starter-webflux': 'web',
  'spring-boot-starter-data-jpa': 'data',
  'spring-boot-starter-data-mongodb': 'data',
  'spring-boot-starter-data-redis': 'data',
  'spring-boot-starter-data-elasticsearch': 'data',
  'spring-boot-starter-data-cassandra': 'data',
  'spring-boot-starter-security': 'security',
  'spring-boot-starter-oauth2-client': 'security',
  'spring-boot-starter-oauth2-resource-server': 'security',
  'spring-boot-starter-test': 'testing',
  'spring-boot-starter-actuator': 'observability',
  'spring-boot-starter-aop': 'other',
  'spring-boot-starter-batch': 'batch',
  'spring-boot-starter-mail': 'other',
  'spring-boot-starter-websocket': 'web',
  'spring-boot-starter-validation': 'web',
  'spring-boot-devtools': 'devtools',
  'spring-cloud-starter': 'cloud',
  'spring-kafka': 'other',
  'spring-rabbitmq': 'other',
  'hibernate-core': 'data',
  'hibernate-entitymanager': 'data',
  'mybatis': 'data',
  'mybatis-spring': 'data',
  'jdbc': 'data',
  'spring-jdbc': 'data',
  'spring-data-jpa': 'data',
  'spring-data-mongodb': 'data',
  'spring-data-redis': 'data',
  'lombok': 'devtools',
  'mapstruct': 'devtools',
  'spring-boot-maven-plugin': 'devtools',
  'spring-boot-gradle-plugin': 'devtools',
};

export const JAVA_SUSPICIOUS_OVERLAPS: Array<{ category: string; deps: string[] }> = [
  {
    category: 'ORM',
    deps: ['spring-boot-starter-data-jpa', 'spring-data-jpa', 'hibernate-core', 'mybatis', 'mybatis-spring'],
  },
  {
    category: 'Web Framework',
    deps: ['spring-boot-starter-web', 'spring-boot-starter-webflux', 'jersey', 'restlet', 'play'],
  },
  {
    category: 'Logging',
    deps: ['log4j', 'log4j2', 'slf4j', 'commons-logging', 'jcl-over-slf4j'],
  },
  {
    category: 'JSON Processing',
    deps: ['jackson-databind', 'gson', 'fastjson', 'json-smart'],
  },
  {
    category: 'HTTP Client',
    deps: ['httpclient', 'webclient', 'resttemplate', 'feign', 'retrofit'],
  },
];

export const JAVA_HEAVY_DEPS = [
  'spring-boot-starter-web',
  'spring-boot-starter-data-jpa',
  'spring-boot-starter-security',
  'spring-boot-starter-actuator',
  'hibernate-core',
  'hibernate-entitymanager',
  'camel-spring-boot',
  'spring-cloud-starter',
  'elasticsearch',
  'log4j',
  'log4j2',
];

const POM_DEP_REGEX = /<dependency>\s*<groupId>([^<]+)<\/groupId>\s*<artifactId>([^<]+)<\/artifactId>\s*(?:<version>([^<]*)<\/version>\s*)?(?:<scope>([^<]*)<\/scope>)?/g;

const GRADLE_DEP_REGEX = /(?:implementation|api|compile|testImplementation|runtimeOnly)\s*["']([^:"']+):([^:"']+):([^:"']+)["']/g;

const SPRING_RULES: Array<[pattern: RegExp, category: DependencyCategory]> = [
  [/cloud/i, 'cloud'],
  [/security/i, 'security'],
  [/data|jpa|mongodb|redis/i, 'data'],
  [/web|mvc|servlet/i, 'web'],
  [/test/i, 'testing'],
  [/actuator|metrics/i, 'observability'],
  [/batch/i, 'batch'],
];

const ORM_PATTERNS = [/hibernate/i, /jpa/i, /mybatis/i];

const DEVTOOLS_PATTERNS = [/lombok/i, /mapstruct/i];

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function scanJavaDependencies(projectPath: string): Promise<{
  totalDeps: number;
  dependencies: JavaDependencyInfo[];
  suspiciousDeps: string[];
  heavyDeps: string[];
  categories: Record<DependencyCategory, number>;
}> {
  const pomPath = path.join(projectPath, 'pom.xml');
  const buildGradlePath = path.join(projectPath, 'build.gradle');
  const buildGradleKtsPath = path.join(projectPath, 'build.gradle.kts');

  try {
    let dependencies: JavaDependencyInfo[] = [];

    if (await fileExists(pomPath)) {
      const pomContent = await fs.readFile(pomPath, 'utf-8');
      dependencies = parsePomXmlDependencies(pomContent);
    } else if (await fileExists(buildGradlePath)) {
      const gradleContent = await fs.readFile(buildGradlePath, 'utf-8');
      dependencies = parseGradleDependencies(gradleContent);
    } else if (await fileExists(buildGradleKtsPath)) {
      const gradleContent = await fs.readFile(buildGradleKtsPath, 'utf-8');
      dependencies = parseGradleDependencies(gradleContent);
    }

    const suspiciousDeps = detectSuspiciousDependencies(dependencies);
    const heavyDeps = detectHeavyDependencies(dependencies);
    const categories = countCategories(dependencies);

    return {
      totalDeps: dependencies.length,
      dependencies,
      suspiciousDeps,
      heavyDeps,
      categories,
    };
  } catch (error) {
    console.warn(`Warning: Error scanning dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return createEmptyResult();
  }
}

function parsePomXmlDependencies(pomContent: string): JavaDependencyInfo[] {
  const dependencies: JavaDependencyInfo[] = [];
  let match;

  while ((match = POM_DEP_REGEX.exec(pomContent)) !== null) {
    const [, groupId, artifactId, version = '', scope = 'compile'] = match;
    dependencies.push({
      groupId,
      artifactId,
      version,
      scope,
      category: categorizeJavaDependency(groupId, artifactId),
    });
  }

  return dependencies;
}

function parseGradleDependencies(content: string): JavaDependencyInfo[] {
  const dependencies: JavaDependencyInfo[] = [];
  let match;

  while ((match = GRADLE_DEP_REGEX.exec(content)) !== null) {
    const [, groupId, artifactId, version] = match;
    dependencies.push({
      groupId,
      artifactId,
      version,
      scope: 'compile',
      category: categorizeJavaDependency(groupId, artifactId),
    });
  }

  return dependencies;
}

export function categorizeJavaDependency(groupId: string, artifactId: string): DependencyCategory {
  const key = artifactId;
  const cached = JAVA_DEPENDENCY_CATEGORIES[key];
  if (cached) {
    return cached;
  }

  if (groupId.includes('spring')) {
    for (const [pattern, category] of SPRING_RULES) {
      if (pattern.test(groupId) || pattern.test(artifactId)) {
        return category;
      }
    }
  }

  if (ORM_PATTERNS.some((p) => p.test(groupId))) {
    return 'data';
  }

  if (groupId.includes('junit') || groupId.includes('testng')) {
    return 'testing';
  }

  if (DEVTOOLS_PATTERNS.some((p) => p.test(groupId))) {
    return 'devtools';
  }

  return 'other';
}

function detectSuspiciousDependencies(dependencies: JavaDependencyInfo[]): string[] {
  const suspiciousDeps: string[] = [];

  for (const overlap of JAVA_SUSPICIOUS_OVERLAPS) {
    const found = dependencies.filter((d) =>
      overlap.deps.some((e) =>
        d.artifactId.includes(e) || d.groupId.includes(e)
      )
    );
    if (found.length > 1) {
      suspiciousDeps.push(
        `Múltiplas libs de ${overlap.category}: ${found.map((f) => f.artifactId).join(', ')}`
      );
    }
  }

  return suspiciousDeps;
}

function detectHeavyDependencies(dependencies: JavaDependencyInfo[]): string[] {
  return dependencies
    .filter((d) => JAVA_HEAVY_DEPS.some((h) => d.artifactId.includes(h) || d.groupId.includes(h)))
    .map((d) => `${d.groupId}:${d.artifactId}`);
}

function countCategories(dependencies: JavaDependencyInfo[]): Record<DependencyCategory, number> {
  const categories: Record<DependencyCategory, number> = {
    web: 0,
    data: 0,
    security: 0,
    testing: 0,
    devtools: 0,
    cloud: 0,
    observability: 0,
    batch: 0,
    other: 0,
  };

  for (const dep of dependencies) {
    categories[dep.category]++;
  }

  return categories;
}

function createEmptyResult() {
  return {
    totalDeps: 0,
    dependencies: [],
    suspiciousDeps: [],
    heavyDeps: [],
    categories: {
      web: 0,
      data: 0,
      security: 0,
      testing: 0,
      devtools: 0,
      cloud: 0,
      observability: 0,
      batch: 0,
      other: 0,
    },
  };
}
