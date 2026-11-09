/**
 * five-vs-five/index.js — Attack & Defend Scenario Game
 * Party Hub game module
 *
 * The classic YouTube format: 10 entities are generated.
 * Choose 5 to defend against the remaining 5 attackers across high-stakes scenarios.
 */

import { POOLS } from '../budget-draft/data/pools.js';
import { getAvatarInitials } from '../../core/player-manager.js';
import { Sound } from '../../core/audio.js';

const SCENARIOS = [
  {
    id: 'zombie-citadel',
    title: '🧟 Zombie Outbreak Citadel',
    desc: 'Hold the fortified mountain citadel for 24 hours against an overwhelming horde and elite mutated bosses.',
    winCondition: 'Defenders must survive 5 attack waves without fortress walls falling.',
    keyAttributes: ['durability', 'stamina', 'crowd_control'],
  },
  {
    id: 'alien-invasion',
    title: '🛸 Alien Mothership Siege',
    desc: 'Repel a high-tech extraterrestrial invasion force descending upon the planetary core reactor.',
    winCondition: 'Eliminate alien siege commanders before reactor overload at minute 10.',
    keyAttributes: ['tech', 'energy_projection', 'tactics'],
  },
  {
    id: 'president-protection',
    title: '💼 Protect the VIP Convoy',
    desc: 'Escort and safeguard the high-priority VIP across a 10-mile warzone ambushed by ruthless assassins.',
    winCondition: 'Keep VIP health above 0 until extracting at the safehouse.',
    keyAttributes: ['speed', 'stealth', 'reflexes'],
  },
  {
    id: 'bank-heist-defense',
    title: '🏦 Federal Vault Breach',
    desc: 'The ultimate heist crew attempts to crack the subterranean hyper-secure reserve vault.',
    winCondition: 'Neutralize the heist crew before the thermite drill cracks the titanium safe.',
    keyAttributes: ['intelligence', 'hacking', 'combat_skill'],
  },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const FiveVsFiveModule = {
  metadata: {
    id: 'five-vs-five',
    title: 'Five vs Five',
    subtitle: 'Attack & Defend Challenge',
    category: 'Battle & Survival',
    description: 'Pick 5 champions to defend against 5 attackers across apocalyptic scenarios! YouTube viral challenge.',
    minPlayers: 2,
    maxPlayers: 2,
    estimatedDuration: '6–10 min',
    emoji: '🛡️',
    tags: ['attack-defend', 'scenarios', 'youtube-format'],
    topics: ['superheroes', 'anime', 'villains', 'cricket', 'football'],
  },

  createInitialState(config, players) {
    const topic = config.topic || 'superheroes';
    const rawPool = POOLS[topic] || POOLS.superheroes;
    const pool = shuffle(rawPool).slice(0, 10);
    const scenario = SCENARIOS[randInt(0, SCENARIOS.length - 1)];

    return {
      phase: 'draft',
      config: { topic, ...config },
      scenario,
      pool,
      players,
      // Player A defends, Player B attacks (or alternate)
      defendersPlayerId: players[0].id,
      attackersPlayerId: players[1]?.id || players[0].id,
      defenderPicks: [],
      attackerPicks: [],
      turn: players[0].id,
      version: 0,
    };
  },

  validateAction(state, action, playerId) {
    if (state.phase !== 'draft') return { valid: false, reason: 'Not in draft phase' };
    if (state.turn !== playerId) return { valid: false, reason: 'Not your turn to draft' };
    const entityId = action.entityId;
    if (!entityId) return { valid: false, reason: 'Missing entityId' };
    if (state.defenderPicks.includes(entityId) || state.attackerPicks.includes(entityId)) {
      return { valid: false, reason: 'Entity already picked' };
    }
    return { valid: true };
  },

  applyAction(state, action, playerId) {
    const isDefender = playerId === state.defendersPlayerId;
    const newDefenderPicks = isDefender ? [...state.defenderPicks, action.entityId] : state.defenderPicks;
    const newAttackerPicks = !isDefender ? [...state.attackerPicks, action.entityId] : state.attackerPicks;

    const totalPicked = newDefenderPicks.length + newAttackerPicks.length;
    const nextPlayer = state.players.find(p => p.id !== playerId) || state.players[0];

    if (totalPicked >= 10 || (newDefenderPicks.length >= 5 && newAttackerPicks.length >= 5)) {
      return {
        ...state,
        defenderPicks: newDefenderPicks,
        attackerPicks: newAttackerPicks,
        phase: 'battle',
      };
    }

    return {
      ...state,
      defenderPicks: newDefenderPicks,
      attackerPicks: newAttackerPicks,
      turn: nextPlayer.id,
    };
  },

  getNextPhase(state) {
    return state.phase === 'battle' ? 'finished' : state.phase;
  },

  calculateResults(state) {
    const defEntities = state.defenderPicks.map(id => state.pool.find(e => e.id === id)).filter(Boolean);
    const attEntities = state.attackerPicks.map(id => state.pool.find(e => e.id === id)).filter(Boolean);

    const defScore = defEntities.reduce((s, e) => s + e.value, 0) + randInt(-5, 5);
    const attScore = attEntities.reduce((s, e) => s + e.value, 0) + randInt(-5, 5);

    const defendersWin = defScore >= attScore;
    const winnerId = defendersWin ? state.defendersPlayerId : state.attackersPlayerId;

    const rounds = [
      `Wave 1: Attackers initiate breach with ${attEntities[0]?.name || 'Assault Squad'}. Defenders hold line with ${defEntities[0]?.name || 'Shield Wall'}!`,
      `Wave 2: Heavy clash at the central gate! ${defEntities[1]?.name || 'Defender'} delivers counter-strike!`,
      `Wave 3: Tactical infiltration attempted by ${attEntities[2]?.name || 'Infiltrator'}!`,
      `Final Wave: ${defendersWin ? 'Defenders hold firm! Assault broken!' : 'Breach successful! Attackers overrun the objective!'}`,
    ];

    return {
      winnerId,
      isTie: false,
      defScore,
      attScore,
      headline: defendersWin ? '🛡️ DEFENDERS VICTORIOUS!' : '⚔️ ATTACKERS BREACHED THE CITADEL!',
      subheadline: defendersWin ? 'The fortress survived the 24-hour siege!' : 'The perimeter fell to the relentless assault!',
      rounds,
      scores: {
        [state.defendersPlayerId]: defendersWin ? 3 : 1,
        [state.attackersPlayerId]: !defendersWin ? 3 : 1,
      },
    };
  },

  isComplete(state) {
    return state.phase === 'battle' || state.phase === 'finished';
  },

  renderLobby(container, context) {
    container.innerHTML = `
      <div class="game-settings-panel">
        <p class="text-sm text-secondary">
          10 entities will be spawned from the selected universe. You and your opponent take turns drafting 5 Defenders vs 5 Attackers into an apocalyptic scenario!
        </p>
      </div>
    `;
  },

  renderGame(container, context) {
    const { state, localPlayerId, players, onAction } = context;
    if (state.phase === 'battle') {
      this.renderResults(container, context);
      return;
    }

    const isMyTurn = state.turn === localPlayerId;
    const isDefender = localPlayerId === state.defendersPlayerId;
    const unpicked = state.pool.filter(e => !state.defenderPicks.includes(e.id) && !state.attackerPicks.includes(e.id));

    container.innerHTML = `
      <div class="five-v-five-view">
        <div class="scenario-banner">
          <h2 class="text-lg font-bold">${escapeHtml(state.scenario.title)}</h2>
          <p class="text-sm text-secondary">${escapeHtml(state.scenario.desc)}</p>
          <div class="text-xs text-orange mt-2"><strong>Objective:</strong> ${escapeHtml(state.scenario.winCondition)}</div>
        </div>

        <div class="turn-bar ${isMyTurn ? 'my-turn' : 'opp-turn'}">
          ${isMyTurn ? `⚡ Your Turn to Draft as ${isDefender ? '🛡️ DEFENDER' : '⚔️ ATTACKER'}!` : '⏳ Opponent is picking...'}
        </div>

        <div class="rosters-comparison-grid">
          <div class="roster-box defender-box">
            <h3 class="text-sm font-bold text-blue">🛡️ DEFENDERS (${state.defenderPicks.length}/5)</h3>
            <div class="picks-pill-list">
              ${state.defenderPicks.map(id => {
                const e = state.pool.find(p => p.id === id);
                return `<span class="badge badge-blue">${escapeHtml(e?.name || id)}</span>`;
              }).join('')}
            </div>
          </div>

          <div class="roster-box attacker-box">
            <h3 class="text-sm font-bold text-red">⚔️ ATTACKERS (${state.attackerPicks.length}/5)</h3>
            <div class="picks-pill-list">
              ${state.attackerPicks.map(id => {
                const e = state.pool.find(p => p.id === id);
                return `<span class="badge badge-red">${escapeHtml(e?.name || id)}</span>`;
              }).join('')}
            </div>
          </div>
        </div>

        <div class="available-pool-section mt-5">
          <h4 class="text-xs text-muted uppercase tracking-wider mb-3">Available Pool (${unpicked.length} Left)</h4>
          <div class="entity-grid">
            ${unpicked.map(e => `
              <div class="entity-card">
                <div class="entity-name font-bold">${escapeHtml(e.name)}</div>
                <div class="entity-role text-xs text-secondary">${escapeHtml(e.role)}</div>
                <div class="entity-meta mt-2">
                  <span class="badge badge-grey">${e.tier}</span>
                  <span class="font-bold text-sm">Pwr: ${e.value}</span>
                </div>
                ${isMyTurn ? `
                  <button class="btn btn-primary btn-sm draft-btn mt-3" data-id="${e.id}">
                    Draft ${isDefender ? '🛡️' : '⚔️'}
                  </button>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('.draft-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Sound.playBid();
        onAction({ entityId: btn.dataset.id });
      });
    });
  },

  renderResults(container, context) {
    const { state, localPlayerId, players } = context;
    const res = this.calculateResults(state);
    Sound.playVictory();

    container.innerHTML = `
      <div class="results-screen">
        <div class="winner-banner">
          <div class="winner-trophy">${res.winnerId === state.defendersPlayerId ? '🛡️' : '⚔️'}</div>
          <div class="winner-name">${escapeHtml(res.headline)}</div>
          <div class="winner-subtitle">${escapeHtml(res.subheadline)}</div>
        </div>

        <div class="sim-log-box mt-4">
          <div class="sim-log-title">📜 COMBAT LOG REPORT</div>
          ${res.rounds.map(r => `
            <div class="sim-log-row">
              <span>${escapeHtml(r)}</span>
            </div>
          `).join('')}
        </div>

        <div class="results-actions mt-6">
          <a href="#lobby" class="btn btn-primary btn-lg">Back to Lobby</a>
        </div>
      </div>
    `;
  },
};
