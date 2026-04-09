# Arquradar - Suporte a Java/Spring Boot

Este documento explica as alterações realizadas para adicionar suporte à análise de projetos **Java/Spring Boot** ao Archradar.

## Visão Geral

O Archradar agora detecta automaticamente o tipo de projeto (JavaScript/TypeScript ou Java/Spring Boot) e aplica as regras de análise apropriadas para cada tecnologia.

## Alterações Realizadas

### 1. Tipos e Interfaces (`src/types/index.ts`)

Adicionados novos tipos para suportar análise Java:

```typescript
// Tipo de projeto
export type ProjectType = 'javascript' | 'java-spring';

// Informações do framework Java
export interface JavaFrameworkInfo extends FrameworkInfo {
  buildTool: 'maven' | 'gradle' | 'unknown';
  springVersion: string;
  javaVersion: string;
}

// Categorias de dependências Java
export type DependencyCategory = 
  | 'web'
  | 'data'
  | 'security'
  | 'testing'
  | 'devtools'
  | 'cloud'
  | 'observability'
  | 'batch'
  | 'other';

// Resultados de análise Java
export interface JavaAnalysisResult {
  complexity: JavaComplexityResult;
  coupling: JavaCouplingResult;
  circularDeps: JavaCircularDepsResult;
  modularity: JavaModularityResult;
}
```

### 2. Detecção de Framework (`src/core/scanner/frameworkDetector.ts`)

#### Detecção de Tipo de Projeto
```typescript
export async function detectProjectType(projectPath: string): Promise<ProjectType>
```
Detecta automaticamente se o projeto é:
- **Java/Spring Boot**: وجود `pom.xml`, `build.gradle`, ou `build.gradle.kts`
- **JavaScript/TypeScript**: presença de `package.json`

#### Detecção de Framework Java
```typescript
export async function detectJavaFramework(projectPath: string): Promise<JavaFrameworkInfo>
```
Identifica:
- Framework (Spring Boot, etc.)
- Build tool (Maven/Gradle)
- Versão do Spring
- Versão do Java

#### Padrões de Starters Spring Detectados
- `spring-boot-starter-web` - Spring Web (MVC)
- `spring-boot-starter-data-jpa` - Spring Data JPA
- `spring-boot-starter-security` - Spring Security
- `spring-boot-starter-actuator` - Observability
- E mais...

### 3. Scanner de Dependências (`src/core/scanner/dependencyScanner.ts`)

#### Parsing de `pom.xml` (Maven)
```typescript
function parsePomXmlDependencies(pomContent: string): JavaDependencyInfo[]
```
Extrai todas as dependências do `pom.xml` com:
- `groupId`
- `artifactId`
- `version`
- `scope`
- `category` (web, data, security, etc.)

#### Parsing de `build.gradle` (Gradle)
```typescript
function parseGradleDependencies(content: string): JavaDependencyInfo[]
```
Suporta sintaxes:
- `implementation "group:artifact:version"`
- `api "group:artifact:version"`
- `compile "group:artifact:version"`

#### Detecção de Dependências Suspeitas
Grupos de sobreposição detectados:
- **ORM**: Hibernate + JPA + MyBatis
- **Web Framework**: Spring MVC + JAX-RS
- **Logging**: log4j + slf4j + logback
- **JSON**: Jackson + Gson + Fastjson
- **HTTP Client**: HttpClient + WebClient + RestTemplate

### 4. Scanner de Arquivos (`src/core/scanner/fileScanner.ts`)

#### Escaneamento de Arquivos Java
```typescript
export async function scanJavaFiles(projectPath: string): Promise<FileScanResult>
```
Padrões de arquivo:
- `**/*.java`
- `**/*.kt`
- `**/*.kts`

Pastas ignoradas:
- `target/`
- `build/`
- `.gradle/`
- `node_modules/`

Limiar de arquivo crítico: **500 linhas** (vs 300 para JS)

### 5. Scanner de Estrutura (`src/core/scanner/structureScanner.ts`)

#### Padrões de Estrutura Spring Detectados

| Padrão | Pastas Required |
|--------|----------------|
| **Spring MVC (Layered)** | `controller`, `service`, `repository` |
| **Spring DDD** | `domain`, `application`, `infrastructure` |
| **Spring Hexagonal** | `adapter`, `domain`, `port` |
| **Spring Modular** | `module`, `shared` |
| **Spring Clean Architecture** | `entrypoint`, `usecase`, `domain`, `driver`, `gateway` |

#### Camadas Spring Detectadas
```typescript
interface SpringLayerInfo {
  controllers: string[];
  services: string[];
  repositories: string[];
  models: string[];
  configs: string[];
}
```

### 6. Análise via tree-sitter (`src/core/analyzer/java/`)

Todos os analyzers Java usam **tree-sitter** com a grammar `tree-sitter-java` para parsing preciso do código.

#### 6.1 Complexity Analyzer (`complexityAnalyzer.ts`)

```typescript
export async function analyzeJavaComplexity(projectPath: string): Promise<JavaComplexityResult>
```

**Nós de complexidade contados:**
- `if_statement`, `else_clause`
- `for_statement`, `for_in_statement`, `enhanced_for_statement`
- `while_statement`, `do_statement`
- `switch_statement`, `case_statement`
- `catch_clause`, `try_statement`
- `conditional_expression`
- `binary_expression`

**Limiar**: Score >= 10 é considerado hotspot

#### 6.2 Coupling Analyzer (`couplingAnalyzer.ts`)

```typescript
export async function analyzeJavaCoupling(projectPath: string): Promise<JavaCouplingResult>
```

Conta imports por arquivo e detecta:
- Alto acoplamento (>10 imports)
- Tipo de arquivo (Controller, Service, Repository, etc.)

#### 6.3 Circular Dependencies Analyzer (`circularDepsAnalyzer.ts`)

```typescript
export async function analyzeJavaCircularDeps(projectPath: string): Promise<JavaCircularDepsResult>
```

Detecta dependências circulares no nível de:
- **Pacotes**: Análise de importações entre packages
- **Arquivos**: Análise de dependências entre classes

#### 6.4 Modularity Analyzer (`modularityAnalyzer.ts`)

```typescript
export async function analyzeJavaModularity(projectPath: string): Promise<JavaModularityResult>
```

**Violações de arquitetura detectadas:**

1. **Controller importando Repository diretamente**
   - Controllers devem usar Services como intermediários
   - Detecta imports contendo `repository` ou `dao`

2. **Service importando Controller**
   - Services não devem conhecer Controllers
   - Detecta imports de `@RestController` ou `@Controller`

3. **Domínio importando Infraestrutura**
   - Camada de domínio deve ser isolada
   - Detecta imports de `infrastructure`, `persistence`, `adapter`

4. **God Classes**
   - Classes com mais de 1000 linhas

### 7. Sistema de Score (`src/core/scoring/`)

#### 7.1 Health Score para Java (`javaHealthScore.ts`)

Pesos ajustados para projetos Java:

| Métrica | Peso | Justificativa |
|---------|------|---------------|
| File Size | 12% | Java容忍 arquivos maiores |
| Critical Files | 13% | Limiar de 500 linhas |
| Structure | 15% | Padrões Spring específicos |
| Dependencies | 15% | Dependências Java categorizadas |
| Coupling | 15% | Limiar de 8 imports ideal |
| Complexity | 15% | Baseado em tree-sitter |
| Modularity | 15% | Regras de camadas Spring |

#### 7.2 Recomendações Java (`recommendations.ts`)

```typescript
export function generateJavaRecommendations(scan, analysis): string[]
```

Recomendações específicas:
- Refatoração de classes >500 linhas
- Extração de métodos de alta complexidade
- Consolidação de dependências sobrepostas
- Adoção de arquitetura em camadas
- Modularização para projetos grandes

### 8. Relatório Terminal (`src/core/report/terminalReport.ts`)

Relatório formatado especificamente para Java:

```
╭──────────────────────────────────────────╮
│  ARCHRADAR — Architectural Intelligence  │
│  Java/Spring Boot Analysis              │
╰──────────────────────────────────────────╯

  Project:   meu-projeto
  Type:       Java/Spring Boot
  Framework: Spring Boot 3.2.0
  Build:      GRADLE
  Java:       17
  Classes:     45
  Avg lines:  120
  Total deps:  12
```

## Uso

```bash
# Escaneamento automático (detecta tipo)
archradar scan /caminho/do/projeto

# Especificar caminho
archradar scan ./meu-projeto-java
```

## Arquivos Criados

```
src/core/analyzer/java/
├── index.ts              # Exports
├── complexityAnalyzer.ts  # Análise de complexidade
├── couplingAnalyzer.ts   # Análise de acoplamento
├── circularDepsAnalyzer.ts # Dependências circulares
└── modularityAnalyzer.ts  # Regras de modularidade

src/core/scoring/
└── javaHealthScore.ts    # Score para Java
```

## Dependências Adicionadas

```json
{
  "tree-sitter": "^0.x.x",
  "tree-sitter-java": "^0.x.x"
}
```

## Fluxo de Execução

```
CLI (bin/cli.ts)
    │
    ├── Scanner.detectProjectType()
    │   └── Detecta: 'javascript' | 'java-spring'
    │
    ├── Scanner.run()
    │   ├── Java? → runJavaScan()
    │   │   ├── detectJavaFramework()
    │   │   ├── scanJavaFiles()
    │   │   ├── scanJavaDependencies()
    │   │   └── scanJavaStructure()
    │   └── JS? → runScan() (original)
    │
    ├── Analyzer.run(projectType)
    │   ├── 'java-spring' → JavaAnalyzers.run()
    │   │   ├── analyzeJavaComplexity()
    │   │   ├── analyzeJavaCoupling()
    │   │   ├── analyzeJavaCircularDeps()
    │   │   └── analyzeJavaModularity()
    │   └── 'javascript' → TSAnalyzers.run() (original)
    │
    ├── ScoreEngine.run(projectType)
    │   ├── 'java-spring' → calculateJavaHealthScore()
    │   └── 'javascript' → calculateHealthScore() (original)
    │
    └── Reporter.display(projectType)
        ├── 'java-spring' → displayJava()
        └── 'javascript' → displayJS() (original)
```

## Limitações

1. **Suporte Kotlin**: Parcial (parsing de `.kt` funciona, mas analisadores otimizados para Java)
2. **Gradle Kotlin DSL**: Suporte básico ao `build.gradle.kts`
3. **Múltiplos módulos**: Análise limitada ao módulo principal

## Próximas Melhorias Possíveis

1. Analyzers específicos para Kotlin
2. Detecção de anotações `@Service`, `@Repository`, `@Controller`
3. Análise de uso de Entity e DTOs
4. Suporte a projetos multi-módulo Maven/Gradle
5. Detecção deviolações de boundary com anotações
6. Integração com Spring Boot Actuator metrics
