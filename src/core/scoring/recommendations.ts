import { ScanResult, AnalysisResult } from '../../types/index.js';

interface Recommendation {
  priority: number;
  message: string;
}

export function generateRecommendations(scan: ScanResult, analysis: AnalysisResult): string[] {
  const recs: Recommendation[] = [];

  if (scan.files.criticalFiles.length > 0) {
    recs.push({
      priority: 1,
      message: `${scan.files.criticalFiles.length} arquivo(s) acima de 300 linhas detectado(s). Considere dividir em módulos menores.`,
    });
  }

  if (scan.files.avgLinesPerFile > 200) {
    recs.push({
      priority: 2,
      message: `Tamanho médio de arquivo alto (${scan.files.avgLinesPerFile} linhas). Prefira arquivos menores e focados.`,
    });
  }

  if (scan.dependencies.suspiciousDeps.length > 0) {
    recs.push({
      priority: 1,
      message: `Dependências sobrepostas detectadas: ${scan.dependencies.suspiciousDeps[0]}. Consolide para uma única solução.`,
    });
  }

  if (scan.dependencies.heavyDeps.length > 0) {
    recs.push({
      priority: 3,
      message: `Dependências pesadas encontradas: ${scan.dependencies.heavyDeps.join(', ')}. Avalie alternativas mais leves.`,
    });
  }

  if (!scan.structure.hasRecognizedPattern) {
    recs.push({
      priority: 2,
      message: 'Estrutura de pastas sem padrão reconhecível. Adote uma convenção clara (feature-based, MVC, etc).',
    });
  }

  if (analysis.coupling.avgCoupling > 15) {
    recs.push({
      priority: 1,
      message: `Acoplamento alto (média ${analysis.coupling.avgCoupling} imports/arquivo). Reduza dependências entre módulos.`,
    });
  }

  if (analysis.complexity.hotspots.length > 0) {
    const worst = analysis.complexity.hotspots[0];
    recs.push({
      priority: 1,
      message: `Complexidade ciclomática alta em "${worst.function}" (${worst.file}, score ${worst.complexity}). Extraia funções menores.`,
    });
  }

  if (analysis.circularDeps.hasCycles) {
    recs.push({
      priority: 1,
      message: `${analysis.circularDeps.cycles.length} dependência(s) circular(is) detectada(s). Reestruture os imports para quebrar os ciclos.`,
    });
  }

  if (analysis.modularity.issues.length > 0) {
    recs.push({
      priority: 2,
      message: analysis.modularity.issues[0],
    });
  }

  if (scan.files.totalFiles > 300) {
    recs.push({
      priority: 3,
      message: `Projeto com ${scan.files.totalFiles} arquivos. Avalie se há código morto ou módulos que podem ser extraídos.`,
    });
  }

  return recs
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5)
    .map((r) => r.message);
}
