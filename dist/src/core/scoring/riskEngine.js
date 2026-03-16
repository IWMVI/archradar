"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRisk = calculateRisk;
const RISK_MAP = [
    { min: 80, level: 'LOW', description: 'Arquitetura saudável. Mantenha as boas práticas.' },
    { min: 60, level: 'MEDIUM', description: 'Atenção recomendada. Alguns pontos merecem revisão.' },
    { min: 40, level: 'HIGH', description: 'Intervenção necessária. Dívida técnica acumulada.' },
    { min: 0, level: 'CRITICAL', description: 'Refatoração urgente. Risco estrutural elevado.' },
];
function calculateRisk(score) {
    for (const { min, level, description } of RISK_MAP) {
        if (score >= min) {
            return { riskLevel: level, riskDescription: description };
        }
    }
    return { riskLevel: 'CRITICAL', riskDescription: 'Refatoração urgente. Risco estrutural elevado.' };
}
//# sourceMappingURL=riskEngine.js.map