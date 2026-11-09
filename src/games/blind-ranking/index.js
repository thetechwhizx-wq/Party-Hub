/**
 * blind-ranking/index.js — Blind Ranking Challenge
 * Party Hub game module
 *
 * Viral TikTok / YouTube Shorts challenge: 5 items appear one-by-one blindly.
 * Place them into ranks #1 through #5 without knowing who comes next!
 */

import { Sound } from '../../core/audio.js';

const BLIND_SETS = [
  {
    category: 'Legendary Footballers',
    items: [
      { name: 'Lionel Messi', trueRank: 1, desc: '8 Ballon d\'Ors, World Cup 2022' },
      { name: 'Cristiano Ronaldo', trueRank: 2, desc: '5 UCLs, 900+ Career Goals' },
      { name: 'Zinedine Zidane', trueRank: 3, desc: 'World Cup Winner, UCL Volley' },
      { name: 'Ronaldinho', trueRank: 4, desc: 'Ballon d\'Or, Samba Magic' },
      { name: 'Thierry Henry', trueRank: 5, desc: 'Arsenal Invincible, Premier League Legend' },
    ],
  },
  {
    category: 'Marvel Cinematic Universe Power',
    items: [
      { name: 'Scarlet Witch', trueRank: 1, desc: 'Chaos Magic, Reality Warping' },
      { name: 'Thor (Awakened)', trueRank: 2, desc: 'God of Thunder, Stormbreaker' },
      { name: 'Doctor Strange', trueRank: 3, desc: 'Master of the Mystic Arts' },
      { name: 'Hulk', trueRank: 4, desc: 'Incredible Raw Strength' },
      { name: 'Iron Man', trueRank: 5, desc: 'Bleeding Edge Nanotech' },
    ],
  },
  {
    category: 'All-Time Modern Cricket Titans',
    items: [
      { name: 'Virat Kohli', trueRank: 1, desc: '50 ODI Centuries, King of Chases' },
      { name: 'Jasprit Bumrah', trueRank: 2, desc: 'World #1 All-Format Pacer' },
      { name: 'Rohit Sharma', trueRank: 3, desc: '3 Double Centuries, World Cup Captain' },
      { name: 'Ben Stokes', trueRank: 4, desc: 'Headingley Miracle, 2 World Cups' },
      { name: 'Pat Cummins', trueRank: 5, desc: 'WTC & ODI World Cup Winning Captain' },
    ],
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

export const BlindRankingModule = {
  metadata: {
    id: 'blind-ranking',
    title: 'Blind Ranking',
    subtitle: 'Viral 1-to-5 Challenge',
    category: 'Popularity & Rankings',
    description: 'Rank 5 entities one-by-one blindly without knowing who comes next! Test your intuition.',
    minPlayers: 2,
    maxPlayers: 2,
    estimatedDuration: '4–6 min',
    emoji: '🔢',
    tags: ['blind-rank', 'shorts-format', 'tiktok-viral'],
  },

  createInitialState(config, players) {
    const set = BLIND_SETS[Math.floor(Math.random() * BLIND_SETS.length)];
    const shuffledItems = shuffle(set.items);

    const rankings = {};
    players.forEach(p => {
      rankings[p.id] = { 1: null, 2: null, 3: null, 4: null, 5: null };
    });

    return {
      phase: 'ranking',
      set,
      items: shuffledItems,
      step: 0,
      players,
      rankings,
      version: 0,
    };
  },

  validateAction(state, action, playerId) {
    if (state.phase !== 'ranking') return { valid: false, reason: 'Not in ranking phase' };
    const rank = Number(action.rank);
    if (![1, 2, 3, 4, 5].includes(rank)) return { valid: false, reason: 'Rank must be 1 to 5' };
    if (state.rankings[playerId]?.[rank] !== null) {
      return { valid: false, reason: `Rank #${rank} is already taken!` };
    }
    return { valid: true };
  },

  applyAction(state, action, playerId) {
    const currentItem = state.items[state.step];
    const rank = Number(action.rank);

    const newPlayerRankings = {
      ...state.rankings[playerId],
      [rank]: currentItem,
    };

    const newRankings = {
      ...state.rankings,
      [playerId]: newPlayerRankings,
    };

    // Check if all players ranked this item
    const allRankedCurrent = state.players.every(p => newRankings[p.id][rank] !== null);

    let nextStep = state.step;
    let nextPhase = state.phase;

    // If both players have assigned a rank for current step, move to next item
    const player1Done = Object.values(newRankings[state.players[0].id]).filter(Boolean).length;
    const player2Done = Object.values(newRankings[state.players[1]?.id || state.players[0].id]).filter(Boolean).length;

    if (player1Done === player2Done && player1Done > state.step) {
      nextStep = state.step + 1;
      if (nextStep >= 5) {
        nextPhase = 'finished';
      }
    }

    return {
      ...state,
      rankings: newRankings,
      step: nextStep,
      phase: nextPhase,
    };
  },

  getNextPhase(state) {
    return state.phase;
  },

  calculateResults(state) {
    // Scoring: Difference between player's rank and true benchmark rank (lower difference = better!)
    const scores = {};
    const breakdowns = {};

    state.players.forEach(p => {
      let penalty = 0;
      const playerRank = state.rankings[p.id];
      Object.entries(playerRank).forEach(([slot, item]) => {
        if (item) {
          penalty += Math.abs(Number(slot) - item.trueRank);
        }
      });
      // Score: 100 max minus penalty * 10
      const finalScore = Math.max(0, 100 - penalty * 12);
      scores[p.id] = finalScore;
      breakdowns[p.id] = { penalty, finalScore };
    });

    const entries = Object.entries(scores).sort(([, a], [, b]) => b - a);
    const isTie = entries.length > 1 && entries[0][1] === entries[1][1];
    const winnerId = isTie ? null : entries[0][0];

    return {
      winnerId,
      isTie,
      scores,
      breakdowns,
      headline: isTie ? 'TIE ON INTUITION!' : `${state.players.find(p => p.id === winnerId)?.displayName || 'Player'} WINS BLIND RANKING!`,
    };
  },

  isComplete(state) {
    return state.phase === 'finished';
  },

  renderLobby(container) {
    container.innerHTML = `
      <div class="game-settings-panel">
        <p class="text-sm text-secondary">
          5 surprise entities appear one by one. Lock them into slots #1 through #5 without knowing who is next!
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

    const currentItem = state.items[state.step];
    const myRankings = state.rankings[localPlayerId] || {};

    container.innerHTML = `
      <div class="blind-ranking-arena">
        <div class="pop-header text-center">
          <span class="badge badge-orange font-bold">BLIND RANKING (${state.step + 1} / 5)</span>
          <h2 class="text-xl font-bold mt-2">${escapeHtml(state.set.category)}</h2>
        </div>

        <!-- Spotlight item to rank -->
        <div class="spotlight-card mt-6">
          <div class="text-xs text-muted uppercase tracking-wider">CURRENT UNKNOWN DROP</div>
          <h1 class="text-2xl font-bold mt-2 text-blue">${escapeHtml(currentItem.name)}</h1>
          <p class="text-sm text-secondary mt-1">${escapeHtml(currentItem.desc)}</p>
        </div>

        <!-- Slot picker 1 through 5 -->
        <div class="ranking-slots-list mt-6">
          ${[1, 2, 3, 4, 5].map(rank => {
            const placed = myRankings[rank];
            return `
              <div class="rank-slot-row ${placed ? 'slot-filled' : 'slot-empty'}">
                <div class="rank-number">#${rank}</div>
                <div class="rank-content">
                  ${placed ? `<span class="font-bold text-white">${escapeHtml(placed.name)}</span>` : '<span class="text-muted">Empty slot</span>'}
                </div>
                ${!placed ? `
                  <button class="btn btn-primary btn-sm assign-rank-btn" data-rank="${rank}">
                    Place at #${rank}
                  </button>
                ` : '<span class="text-xs text-green font-bold">LOCKED</span>'}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.assign-rank-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Sound.playBid();
        onAction({ rank: btn.dataset.rank });
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
          <div class="winner-trophy">👑</div>
          <div class="winner-name">${escapeHtml(res.headline)}</div>
        </div>

        <!-- Benchmark reveal -->
        <div class="benchmark-box mt-6">
          <h3 class="text-sm font-bold text-orange uppercase">Official Benchmark Ranks</h3>
          <div class="flex flex-col gap-2 mt-3">
            ${state.set.items.sort((a, b) => a.trueRank - b.trueRank).map((item, idx) => `
              <div class="flex justify-between p-2 bg-secondary rounded text-sm">
                <span><strong>#${idx + 1}</strong> ${escapeHtml(item.name)}</span>
                <span class="text-xs text-muted">${escapeHtml(item.desc)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="results-actions mt-6">
          <a href="#lobby" class="btn btn-primary btn-lg">Back to Lobby</a>
        </div>
      </div>
    `;
  },
};
