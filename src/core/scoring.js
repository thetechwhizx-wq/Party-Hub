/**
 * scoring.js — Shared scoring helpers
 * Party Hub core module
 */

/** Tier point values */
export const TIER_POINTS = {
  S: 10,
  A: 7,
  B: 4,
  C: 2,
};

/**
 * Calculate total tier score for a list of entities.
 * @param {object[]} entities - Array of entity objects with { tier }
 * @returns {number}
 */
export function calcTierScore(entities) {
  return entities.reduce((sum, e) => sum + (TIER_POINTS[e.tier] || 0), 0);
}

/**
 * Calculate budget efficiency score.
 * Rewards spending less while getting high tier picks.
 * @param {number} budget - Total budget
 * @param {number} spent - Amount spent
 * @param {number} tierScore - Tier-based score
 * @returns {number} Efficiency score (0-100)
 */
export function calcBudgetEfficiency(budget, spent, tierScore) {
  if (budget <= 0) return 0;
  const spendRatio = spent / budget;
  const rawEfficiency = tierScore / Math.max(spent, 1);
  // Normalize to 0-100 range, bonus for unspent budget
  const unused = budget - spent;
  const unusedBonus = Math.floor(unused * 0.3);
  return Math.round(rawEfficiency * 10 + unusedBonus);
}

/**
 * Calculate role diversity score.
 * Rewards teams with varied roles.
 * @param {object[]} entities - Each with { role }
 * @returns {number} 0-100
 */
export function calcRoleDiversity(entities) {
  if (!entities.length) return 0;
  const roles = new Set(entities.map(e => e.role));
  return Math.round((roles.size / entities.length) * 100);
}

/**
 * Determine winner from scores map.
 * @param {{ [playerId: string]: number }} scores
 * @returns {{ winnerId: string | null, isTie: boolean }}
 */
export function determineWinner(scores) {
  const entries = Object.entries(scores);
  if (entries.length === 0) return { winnerId: null, isTie: false };

  entries.sort(([, a], [, b]) => b - a);
  const [topId, topScore] = entries[0];

  if (entries.length > 1 && entries[1][1] === topScore) {
    return { winnerId: null, isTie: true };
  }
  return { winnerId: topId, isTie: false };
}

/**
 * Format a score for display.
 * @param {number} score
 * @returns {string}
 */
export function formatScore(score) {
  return score.toLocaleString();
}
