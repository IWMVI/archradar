"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const healthScore_js_1 = require("./healthScore.js");
const riskEngine_js_1 = require("./riskEngine.js");
const recommendations_js_1 = require("./recommendations.js");
function run(scan, analysis) {
    const { health, breakdown } = (0, healthScore_js_1.calculateHealthScore)(scan, analysis);
    const risk = (0, riskEngine_js_1.calculateRisk)(health.score);
    const recommendations = (0, recommendations_js_1.generateRecommendations)(scan, analysis);
    return { health, risk, recommendations, breakdown };
}
//# sourceMappingURL=index.js.map