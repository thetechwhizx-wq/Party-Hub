/**
 * counter-pick/index.js — Tactical Counter-Pick Duel
 * Party Hub game module
 *
 * Fast-paced tactical duel: Opponent drops a champion, you have 15s to lock in the hard counter!
 */

import { POOLS } from '../budget-draft/data/pools.js';
import { Sound } from '../../core/audio.js';

export const CounterPickModule = {
  metadata: {
    id: 'counter-pick',
    title: 'Counter-Pick Duel',
    subtitle: 'Tactical Rock-Paper-Scissors Duel',
    category: 'Versus',
    description: 'Opponent reveals their champion. You have 15 seconds to deploy the ultimate counter!',
    minPlayers: 2,
    maxPlayers: 2,
    estimatedDuration: '4–6 min',
    emoji: '⚔️',
    tags: ['counter-pick', 'versus', 'fast-paced'],
  },

  createInitialState(config, players) {
    const heroes = POOLS.superheroes.slice(0, 12);
    const scores = {};
    players.forEach(p => { scores[p.id] = 0; });

    return {
      phase: 'round',
      round: 1,
      maxRounds: 4,
      heroes,
      players,
      scores,
      leadPlayerId: players[0].id,
      counterPlayerId: players[1]?.id || players[0].id,
      leadPick: null,
      counterPick: null,
      version: 0,
    };
  },

  validateAction(state, action, playerId) {
    if (state.phase !== 'round') return { valid: false, reason: 'Round over' };
    const hero = state.heroes.find(h => h.id === action.heroId);
    if (!hero) return { valid: false, reason: 'Invalid champion' };

    if (!state.leadPick && playerId !== state.leadPlayerId) {
      return { valid: false, reason: 'Waiting for lead player to pick' };
    }
    if (state.leadPick && playerId !== state.counterPlayerId) {
      return { valid: false, reason: 'Waiting for counter player' };
    }
    return { valid: true };
  },

  applyAction(state, action, playerId) {
    const hero = state.heroes.find(h => h.id === action.heroId);

    // Lead pick
    if (!state.leadPick) {
      return {
        ...state,
        leadPick: hero,
      };
    }

    // Counter pick
    const lead = state.leadPick;
    const counter = hero;

    // Counter advantage evaluation
    const counterAdvantage = counter.value > lead.value || Math.random() > 0.4;
    const newScores = { ...state.scores };

    if (counterAdvantage) {
      newScores[state.counterPlayerId] = (newScores[state.counterPlayerId] || 0) + 15;
    } else {
      newScores[state.leadPlayerId] = (newScores[state.leadPlayerId] || 0) + 10;
    }

    const nextRound = state.round + 1;
    const isFinished = nextRound > state.maxRounds;

    return {
      ...state,
      scores: newScores,
      leadPick: null,
      counterPick: null,
      round: nextRound,
      leadPlayerId: state.counterPlayerId, // swap roles
      counterPlayerId: state.leadPlayerId,
      phase: isFinished ? 'finished' : 'round',
    };
  },

  getNextPhase(state) {
    return state.phase;
  },

  calculateResults(state) {
    const entries = Object.entries(state.scores).sort(([, a], [, b]) => b - a);
    const isTie = entries.length > 1 && entries[0][1] === entries[1][1];
    const winnerId = isTie ? null : entries[0][0];

    return {
      winnerId,
      isTie,
      scores: state.scores,
      headline: isTie ? 'TACTICAL STALEMATE!' : `${state.players.find(p => p.id === winnerId)?.displayName || 'Player'} MASTERED THE COUNTER!`,
    };
  },

  isComplete(state) {
    return state.phase === 'finished';
  },

  renderLobby(container) {
    container.innerHTML = `
      <div class="game-settings-panel">
        <p class="text-sm text-secondary">
          Player 1 drops a champion. Player 2 has 15 seconds to lock in the counter! Roles alternate each round.
        </p>
      </div>
    `;
  },

  renderGame(container, context) {
    const { state, localPlayerId, players, onAction } = context;
    if (state.phase === 'finished') {
      this.renderResults(container, context);
      return;
    }

    const isLead = localPlayerId === state.leadPlayerId;
    const isCounter = localPlayerId === state.counterPlayerId;
    const waitingForLead = !state.leadPick;

    container.innerHTML = `
      <div class="counter-pick-arena">
        <div class="pop-header text-center">
          <span class="badge badge-purple">ROUND ${state.round} OF ${state.maxRounds}</span>
          <h2 class="text-xl font-bold mt-2">⚔️ Counter-Pick Duel</h2>
        </div>

        <div class="duel-stage mt-6">
          <!-- Lead champion spot -->
          <div class="card duel-card">
            <span class="text-xs text-muted uppercase">FIRST DROP</span>
            ${state.leadPick ? `
              <h3 class="text-xl font-bold text-blue mt-2">${state.leadPick.name}</h3>
              <span class="badge badge-blue mt-1">Power ${state.leadPick.value}</span>
            ` : `
              <div class="text-secondary mt-3">
                ${isLead ? '⚡ YOUR TURN TO DROP A CHAMPION' : '⏳ Waiting for first drop...'}
              </div>
            `}
          </div>
        </div>

        <!-- Available champions to pick -->
        ${(isLead && waitingForLead) || (isCounter && !waitingForLead) ? `
          <div class="mt-6">
            <h4 class="text-xs text-muted uppercase tracking-wider mb-3">SELECT YOUR CHAMPION:</h4>
            <div class="entity-grid">
              ${state.heroes.map(h => `
                <div class="entity-card">
                  <span class="font-bold text-sm">${h.name}</span>
                  <span class="badge badge-grey mt-1">Tier ${h.tier}</span>
                  <button class="btn btn-primary btn-sm select-hero-btn mt-3" data-id="${h.id}">
                    Deploy ⚔️
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <div class="text-center text-secondary font-bold mt-6">
            Waiting for opponent move...
          </div>
        `}
      </div>
    `;

    container.querySelectorAll('.select-hero-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Sound.playBid();
        onAction({ heroId: btn.dataset.id });
      });
    });
  },

  renderResults(container, context) {
    const { state, players } = context;
    const res = this.calculateResults(state);
    Sound.playVictory();

    container.innerHTML = `
      <div class="results-screen">
        <div class="winner-banner">
          <div class="winner-trophy">⚔️</div>
          <div class="winner-name">${res.headline}</div>
        </div>
        <div class="results-actions mt-6">
          <a href="#lobby" class="btn btn-primary btn-lg">Back to Lobby</a>
        </div>
      </div>
    `;
  },
};
