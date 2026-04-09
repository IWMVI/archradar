export type ProjectType = 'javascript' | 'java-spring';

export interface FileInfo {
  path: string;
  lines: number;
  sizeBytes: number;
}

export interface ScanResult {
  projectPath: string;
  projectType: ProjectType;
  framework: FrameworkInfo;
  files: FileScanResult;
  dependencies: DependencyScanResult;
  structure: StructureScanResult;
}

export interface FrameworkInfo {
  framework: string;
  version: string;
  bundler: string;
}

export interface JavaFrameworkInfo extends FrameworkInfo {
  buildTool: 'maven' | 'gradle' | 'unknown';
  springVersion: string;
  javaVersion: string;
}

export interface FileScanResult {
  totalFiles: number;
  avgLinesPerFile: number;
  criticalFiles: FileInfo[];
}

export interface DependencyScanResult {
  totalDeps: number;
  suspiciousDeps: string[];
  heavyDeps: string[];
}

export interface StructureScanResult {
  folders: string[];
  hasRecognizedPattern: boolean;
  patternName: string;
}

export interface AnalysisResult {
  complexity: ComplexityResult;
  coupling: CouplingResult;
  circularDeps: CircularDepsResult;
  modularity: ModularityResult;
}

export interface ComplexityResult {
  avgComplexity: number;
  hotspots: Array<{ file: string; function: string; complexity: number }>;
}

export interface CouplingResult {
  avgCoupling: number;
  highCouplingFiles: Array<{ file: string; imports: number }>;
}

export interface CircularDepsResult {
  hasCycles: boolean;
  cycles: string[][];
}

export interface ModularityResult {
  modularityScore: number;
  issues: string[];
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface HealthScore {
  score: number;
  grade: Grade;
}

export interface RiskInfo {
  riskLevel: RiskLevel;
  riskDescription: string;
}

export interface ScoreResult {
  health: HealthScore;
  risk: RiskInfo;
  recommendations: string[];
  breakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  fileSize: number;
  criticalFiles: number;
  structure: number;
  dependencies: number;
  coupling: number;
  complexity: number;
  modularity: number;
}

export interface JavaDependencyInfo {
  groupId: string;
  artifactId: string;
  version: string;
  scope: string;
  category: DependencyCategory;
}

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

export interface JavaComplexityResult {
  avgComplexity: number;
  hotspots: Array<{ file: string; className: string; method: string; complexity: number }>;
}

export interface JavaCouplingResult {
  avgCoupling: number;
  highCouplingFiles: Array<{ file: string; imports: number; type: string }>;
}

export interface JavaCircularDepsResult {
  hasCycles: boolean;
  cycles: Array<{ packagePath: string; files: string[] }>;
}

export interface JavaModularityResult {
  modularityScore: number;
  issues: string[];
}

export interface JavaAnalysisResult {
  complexity: JavaComplexityResult;
  coupling: JavaCouplingResult;
  circularDeps: JavaCircularDepsResult;
  modularity: JavaModularityResult;
}

export interface SpringLayerInfo {
  controllers: string[];
  services: string[];
  repositories: string[];
  models: string[];
  configs: string[];
}
