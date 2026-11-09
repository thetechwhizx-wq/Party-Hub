/**
 * popularity-battle/index.js — Popularity Battle / Higher or Lower
 * Party Hub game module
 *
 * Real internet comparison challenge with authentic stats, sources, and dates.
 */

import { Sound } from '../../core/audio.js';

const COMPARISONS = [
  {
    topic: 'Instagram Followers',
    itemA: { name: 'Cristiano Ronaldo', value: 640, display: '640 Million' },
    itemB: { name: 'Lionel Messi', value: 504, display: '504 Million' },
    source: 'Instagram Official API (2024)',
  },
  {
    topic: 'Worldwide Box Office',
    itemA: { name: 'Avatar (2009)', value: 2923, display: '$2.92 Billion' },
    itemB: { name: 'Avengers: Endgame', value: 2799, display: '$2.79 Billion' },
    source: 'Box Office Mojo',
  },
  {
    topic: 'All-Time Video Game Sales',
    itemA: { name: 'Minecraft', value: 300, display: '300 Million Copies' },
    itemB: { name: 'Grand Theft Auto V', value: 205, display: '205 Million Copies' },
    source: 'Take-Two & Mojang Financial Reports',
  },
  {
    topic: 'YouTube Channel Subscribers',
    itemA: { name: 'MrBeast', value: 330, display: '330 Million' },
    itemB: { name: 'T-Series', value: 280, display: '280 Million' },
    source: 'YouTube Live Sub Counts',
  },
  {
    topic: 'Spotify Monthly Listeners',
    itemA: { name: 'The Weeknd', value: 118, display: '118 Million' },
    itemB: { name: 'Taylor Swift', value: 104, display: '104 Million' },
    source: 'Spotify Charts Global Top Artists',
  },
  {
    topic: 'International Cricket Centuries',
    itemA: { name: 'Sachin Tendulkar', value: 100, display: '100 Centuries' },
    itemB: { name: 'Virat Kohli', value: 80, display: '80 Centuries' },
    source: 'ICC All-Format Records',
  },
];

export const PopularityBattleModule = {
  metadata: {
    id: 'popularity-battle',
    title: 'Popularity Battle',
    subtitle: 'Higher or Lower Showdown',
    category: 'Popularity & Rankings',
    description: 'Who has more followers, box office, or views? Guess under pressure with real verified stats!',
    minPlayers: 2,
    maxPlayers: 2,
    estimatedDuration: '4–6 min',
    emoji: '📈',
    tags: ['trivia', 'higher-lower', 'stats', 'internet-culture'],
  },

  createInitialState(config, players) {
    const questions = [...COMPARISONS].sort(() => Math.random() - 0.5).slice(0, 5);
    const scores = {};
    players.forEach(p => { scores[p.id] = 0; });

    return {
      phase: 'round',
      roundIndex: 0,
      totalRounds: 5,
      questions,
      players,
      scores,
      answers: {}, // playerId -> 'A' | 'B'
      revealed: false,
      version: 0,
    };
  },

  validateAction(state, action, playerId) {
    if (state.phase !== 'round') return { valid: false, reason: 'Not in round phase' };
    if (!action || !['A', 'B'].includes(action.choice)) {
      return { valid: false, reason: 'Invalid choice' };
    }
    return { valid: true };
  },

  applyAction(state, action, playerId) {
    const newAnswers = { ...state.answers, [playerId]: action.choice };
    const allAnswered = state.players.every(p => newAnswers[p.id]);

    if (allAnswered) {
      // Score this round
      const currentQ = state.questions[state.roundIndex];
      const correctChoice = currentQ.itemA.value >= currentQ.itemB.value ? 'A' : 'B';

      const newScores = { ...state.scores };
      state.players.forEach(p => {
        if (newAnswers[p.id] === correctChoice) {
          newScores[p.id] = (newScores[p.id] || 0) + 10;
        }
      });

      return {
        ...state,
        answers: newAnswers,
        scores: newScores,
        revealed: true,
      };
    }

    return {
      ...state,
      answers: newAnswers,
    };
  },

  getNextPhase(state) {
    if (state.roundIndex >= state.totalRounds - 1 && state.revealed) {
      return 'finished';
    }
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
      headline: isTie ? "IT'S A DEAD TIE!" : `${state.players.find(p => p.id === winnerId)?.displayName || 'Player'} WINS!`,
    };
  },

  isComplete(state) {
    return state.phase === 'finished';
  },

  renderLobby(container) {
    container.innerHTML = `
      <div class="game-settings-panel">
        <p class="text-sm text-secondary">
          5 fast-paced comparison questions (Instagram followers, YouTube subs, Box Office, Spotify). Pick who has higher stats!
        </p>
      </div>
    `;
  },

  renderGame(container, context) {
    const { state, localPlayerId, players, onAction } = context;
    const q = state.questions[state.roundIndex];
    const hasAnswered = !!state.answers[localPlayerId];
    const correctChoice = q.itemA.value >= q.itemB.value ? 'A' : 'B';

    container.innerHTML = `
      <div class="popularity-arena">
        <div class="pop-header">
          <span class="badge badge-blue">ROUND ${state.roundIndex + 1} OF ${state.totalRounds}</span>
          <h2 class="text-xl font-bold mt-2">${escapeHtml(q.topic)}</h2>
          <span class="text-xs text-muted">Who ranks higher?</span>
        </div>

        <div class="versus-cards-grid mt-6">
          <!-- Option A -->
          <div class="card card-interactive choice-card ${state.revealed && correctChoice === 'A' ? 'card-winner-glow' : ''}" id="choice-a">
            <h3 class="text-lg font-bold">${escapeHtml(q.itemA.name)}</h3>
            <div class="stat-reveal mt-3">
              ${state.revealed ? `<span class="stat-number text-green">${escapeHtml(q.itemA.display)}</span>` : '<span class="text-muted">???</span>'}
            </div>
            ${!state.revealed && !hasAnswered ? `
              <button class="btn btn-primary btn-block pick-opt-btn mt-4" data-pick="A">Pick This</button>
            ` : ''}
          </div>

          <div class="vs-divider">VS</div>

          <!-- Option B -->
          <div class="card card-interactive choice-card ${state.revealed && correctChoice === 'B' ? 'card-winner-glow' : ''}" id="choice-b">
            <h3 class="text-lg font-bold">${escapeHtml(q.itemB.name)}</h3>
            <div class="stat-reveal mt-3">
              ${state.revealed ? `<span class="stat-number text-green">${escapeHtml(q.itemB.display)}</span>` : '<span class="text-muted">???</span>'}
            </div>
            ${!state.revealed && !hasAnswered ? `
              <button class="btn btn-primary btn-block pick-opt-btn mt-4" data-pick="B">Pick This</button>
            ` : ''}
          </div>
        </div>

        ${state.revealed ? `
          <div class="reveal-banner mt-6 text-center">
            <div class="text-sm font-bold text-secondary">Source: ${escapeHtml(q.source)}</div>
            <button class="btn btn-primary btn-lg mt-4" id="next-pop-round-btn">
              ${state.roundIndex < state.totalRounds - 1 ? 'Next Round →' : 'See Final Results 🏆'}
            </button>
          </div>
        ` : hasAnswered ? `
          <div class="text-center mt-6 text-secondary font-bold">
            ⏳ Pick submitted! Waiting for opponent...
          </div>
        ` : ''}

        <div class="scoreboard-bar mt-6">
          ${players.map(p => `
            <div class="score-pill">
              <span>${escapeHtml(p.displayName)}</span>
              <strong>${state.scores[p.id] || 0} pts</strong>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.pick-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Sound.playBid();
        onAction({ choice: btn.dataset.pick });
      });
    });

    container.querySelector('#next-pop-round-btn')?.addEventListener('click', () => {
      if (state.roundIndex < state.totalRounds - 1) {
        state.roundIndex++;
        state.revealed = false;
        state.answers = {};
        this.renderGame(container, context);
      } else {
        state.phase = 'finished';
        this.renderResults(container, context);
      }
    });
  },

  renderResults(container, context) {
    const { state, localPlayerId, players } = context;
    const res = this.calculateResults(state);
    Sound.playVictory();

    container.innerHTML = `
      <div class="results-screen">
        <div class="winner-banner">
          <div class="winner-trophy">🏆</div>
          <div class="winner-name">${escapeHtml(res.headline)}</div>
        </div>

        <div class="score-breakdown-grid mt-6">
          ${players.map(p => `
            <div class="score-player-panel">
              <span class="font-bold">${escapeHtml(p.displayName)}</span>
              <span class="score-total">${state.scores[p.id] || 0} pts</span>
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
