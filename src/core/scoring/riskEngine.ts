import { RiskInfo, RiskLevel } from '../../types/index.js';

const RISK_MAP: Array<{ min: number; level: RiskLevel; description: string }> = [
  { min: 80, level: 'LOW', description: 'Arquitetura saudável. Mantenha as boas práticas.' },
  { min: 60, level: 'MEDIUM', description: 'Atenção recomendada. Alguns pontos merecem revisão.' },
  { min: 40, level: 'HIGH', description: 'Intervenção necessária. Dívida técnica acumulada.' },
  { min: 0, level: 'CRITICAL', description: 'Refatoração urgente. Risco estrutural elevado.' },
];

export function calculateRisk(score: number): RiskInfo {
  for (const { min, level, description } of RISK_MAP) {
    if (score >= min) {
      return { riskLevel: level, riskDescription: description };
    }
  }
  return { riskLevel: 'CRITICAL', riskDescription: 'Refatoração urgente. Risco estrutural elevado.' };
}
