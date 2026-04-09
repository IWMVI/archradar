import { ScanResult, AnalysisResult, ScoreResult, ProjectType, JavaAnalysisResult } from '../../types/index.js';
import { displayJS } from './javascript/jsReport.js';
import { displayJava } from './java/javaReport.js';

export function display(
  scan: ScanResult,
  analysis: AnalysisResult | JavaAnalysisResult,
  score: ScoreResult,
  projectType: ProjectType = 'javascript'
): void {
  if (projectType === 'java-spring') {
    displayJava(scan, analysis as JavaAnalysisResult, score);
    return;
  }
  displayJS(scan, analysis as AnalysisResult, score);
}
