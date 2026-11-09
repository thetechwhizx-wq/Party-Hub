/**
 * results.js — Shared results screen renderer
 * Party Hub shared module
 */

import { getAvatarInitials } from '../core/player-manager.js';

/**
 * Render a generic results screen.
 *
 * @param {HTMLElement} container
 * @param {object} opts
 * @param {object} opts.results - { winner, winnerId, isTie, scores, breakdown }
 * @param {object[]} opts.players - Array of { id, displayName, color }
 * @param {string} opts.localPlayerId
 * @param {Function} opts.onRematch
 * @param {Function} opts.onLeave
 */
export function renderResultsScreen(container, { results, players, localPlayerId, onRematch, onLeave }) {
  const { winnerId, isTie, scores, breakdown } = results;

  const winnerPlayer = winnerId ? players.find(p => p.id === winnerId) : null;
  const isMeWinner = winnerId === localPlayerId;

  container.innerHTML = `
    <div class="results-screen">
      ${renderWinnerBanner(winnerPlayer, isTie, isMeWinner)}
      ${renderScoreBreakdown(breakdown, players, scores, localPlayerId)}
      <div class="results-actions">
        <button class="btn btn-primary btn-lg" id="rematch-btn">🔄 Rematch</button>
        <button class="btn btn-ghost btn-lg" id="leave-btn">Leave Room</button>
      </div>
    </div>
  `;

  container.querySelector('#rematch-btn')?.addEventListener('click', onRematch);
  container.querySelector('#leave-btn')?.addEventListener('click', onLeave);
}

function renderWinnerBanner(winnerPlayer, isTie, isMeWinner) {
  if (isTie) {
    return `
      <div class="winner-banner tie-banner">
        <div class="winner-trophy">🤝</div>
        <div class="winner-label">It's a Tie!</div>
        <div class="winner-name">Both teams were equally matched</div>
        <div class="winner-subtitle">That was close!</div>
      </div>
    `;
  }

  if (!winnerPlayer) {
    return `
      <div class="winner-banner">
        <div class="winner-trophy">🏆</div>
        <div class="winner-label">Game Complete</div>
        <div class="winner-name">Match Finished</div>
      </div>
    `;
  }

  const youLabel = isMeWinner ? ' (You!)' : '';

  return `
    <div class="winner-banner">
      <div class="winner-trophy">🏆</div>
      <div class="winner-label">Winner</div>
      <div class="winner-name">${escapeHtml(winnerPlayer.displayName)}${youLabel}</div>
      <div class="winner-subtitle">${isMeWinner ? 'Congratulations! Well drafted! 🎉' : 'Better luck next time!'}</div>
    </div>
  `;
}

function renderScoreBreakdown(breakdown, players, scores, localPlayerId) {
  if (!breakdown || !players) return '';

  return `
    <div class="score-breakdown">
      <div class="score-breakdown-title">Score Breakdown</div>
      <div class="score-breakdown-grid">
        ${players.map(player => renderPlayerPanel(player, breakdown, scores, localPlayerId)).join('')}
      </div>
    </div>
  `;
}

function renderPlayerPanel(player, breakdown, scores, localPlayerId) {
  const isWinner = scores && scores[player.id] === Math.max(...Object.values(scores));
  const isMe = player.id === localPlayerId;
  const initials = getAvatarInitials(player.displayName);
  const totalScore = scores?.[player.id] ?? 0;
  const playerBreakdown = breakdown?.[player.id];

  const picksHtml = playerBreakdown?.picks
    ? playerBreakdown.picks.map(pick => `
        <div class="result-row">
          <div style="
            width:24px;height:24px;border-radius:50%;background:${player.color};
            display:flex;align-items:center;justify-content:center;
            font-size:0.6rem;font-weight:800;color:white;flex-shrink:0;
          ">${getAvatarInitials(pick.name)}</div>
          <span class="result-row-name">${escapeHtml(pick.name)}</span>
          <span class="badge badge-${tierClass(pick.tier)}">${pick.tier}</span>
          <span class="result-row-score">+${pick.points}pts</span>
        </div>
      `).join('')
    : '';

  const detailRows = playerBreakdown?.details
    ? playerBreakdown.details.map(d => `
        <div class="score-detail-row">
          <span class="score-detail-label">${escapeHtml(d.label)}</span>
          <span class="score-detail-value">${d.value}</span>
        </div>
      `).join('')
    : '';

  return `
    <div class="score-player-panel${isWinner ? ' winner' : ''}">
      <div class="score-player-header">
        <div class="flex items-center gap-3">
          <div style="
            width:36px;height:36px;border-radius:50%;background:${player.color};
            display:flex;align-items:center;justify-content:center;
            font-size:0.85rem;font-weight:800;color:white;
          ">${initials}</div>
          <div>
            <div class="font-semibold text-sm">${escapeHtml(player.displayName)}${isMe ? ' (You)' : ''}</div>
            ${isWinner ? '<div class="badge badge-green" style="margin-top:2px">Winner</div>' : ''}
          </div>
        </div>
        <div class="score-total">${totalScore}pts</div>
      </div>
      <div class="score-player-picks">
        ${picksHtml}
      </div>
      ${detailRows ? `<div>${detailRows}</div>` : ''}
    </div>
  `;
}

function tierClass(tier) {
  return { S: 'gold', A: 'blue', B: 'green', C: 'grey' }[tier] || 'grey';
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
