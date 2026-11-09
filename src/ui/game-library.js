/**
 * game-library.js — Game library view
 * Party Hub UI module
 */

import { GameRegistry } from '../core/game-registry.js';
import { navigate } from './navigation.js';

/**
 * Render the game library view.
 * @param {HTMLElement} container
 */
export function renderGameLibrary(container) {
  const games = GameRegistry.getAll();
  const categories = [...new Set(games.map(g => g.metadata.category))];

  container.innerHTML = `
    <div class="view-section">
      <div class="section-header">
        <h1 class="section-title">🎮 Game Library</h1>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar" id="category-filters" role="group" aria-label="Filter by category">
        <button class="chip chip-interactive chip-active" data-category="all">All Games</button>
        ${categories.map(cat => `
          <button class="chip chip-interactive" data-category="${cat}">${cat}</button>
        `).join('')}
      </div>
    </div>

    <!-- Games Grid -->
    <div class="grid gap-6" id="games-grid" style="grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));">
      ${games.length === 0 ? renderEmptyState() : games.map(renderGameCard).join('')}
    </div>
  `;

  // Filter logic
  let activeCategory = 'all';
  const grid = container.querySelector('#games-grid');

  container.querySelectorAll('.chip[data-category]').forEach(chip => {
    chip.addEventListener('click', () => {
      activeCategory = chip.dataset.category;

      // Update active chip
      container.querySelectorAll('.chip[data-category]').forEach(c => {
        c.classList.toggle('chip-active', c.dataset.category === activeCategory);
      });

      // Filter cards
      const filtered = activeCategory === 'all'
        ? games
        : games.filter(g => g.metadata.category === activeCategory);

      grid.innerHTML = filtered.length === 0
        ? renderEmptyState()
        : filtered.map(renderGameCard).join('');

      wireCardButtons(grid);
    });
  });

  wireCardButtons(container);
}

function renderGameCard(game) {
  const { id, title, subtitle, description, minPlayers, maxPlayers, estimatedDuration, category, tags, emoji } = game.metadata;

  const tagHtml = (tags || []).slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('');
  const playerText = minPlayers === maxPlayers
    ? `${minPlayers} players`
    : `${minPlayers}–${maxPlayers} players`;

  return `
    <div class="game-card" data-game-id="${id}" role="article" tabindex="0" aria-label="${title}">
      <div class="game-card-thumbnail">
        <span role="img" aria-label="${title}">${emoji || '🎮'}</span>
      </div>
      <div class="game-card-body">
        <div class="game-card-title">${title}</div>
        <div class="game-card-subtitle">${subtitle || category}</div>
        <div class="game-card-description">${description}</div>
        <div class="flex gap-2 flex-wrap mt-2">
          ${tagHtml}
        </div>
        <div class="game-card-meta mt-2">
          <span>👥 ${playerText}</span>
          <span>⏱ ${estimatedDuration || '10 min'}</span>
        </div>
      </div>
      <div class="game-card-footer">
        <span class="badge badge-blue">${category}</span>
        <button class="btn btn-primary btn-sm play-btn" data-game-id="${id}">
          Play →
        </button>
      </div>
    </div>
  `;
}

function renderEmptyState() {
  return `
    <div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state-icon">🎲</div>
      <h3>No games found</h3>
      <p>Try a different category filter</p>
    </div>
  `;
}

function wireCardButtons(container) {
  container.querySelectorAll('.play-btn[data-game-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigate('home');
      // A short delay to let home view render, then trigger create room
      setTimeout(() => {
        document.getElementById('nav-create-btn')?.click();
      }, 100);
    });
  });

  container.querySelectorAll('.game-card[data-game-id]').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.classList.contains('play-btn')) {
        // Could navigate to game detail in future
      }
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') card.click();
    });
  });
}
