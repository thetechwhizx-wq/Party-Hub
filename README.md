# 🎮 Party Hub

> A browser-based multiplayer party game platform. No accounts, no downloads — just share a code and play.

## Phase 1 Status: ✅ Complete

### How to Open

**Just open `index.html` in a browser.** No build step, no server needed for single-player testing.

> For multiplayer to work, you need HTTPS or localhost (PeerJS WebRTC requirement).
> 
> **Quick local server:**
> ```bash
> # Python
> python -m http.server 8080
> # Then open: http://localhost:8080
> ```
> Or use VS Code Live Server / any static file server.

---

## Playing with Two Devices

1. **Player 1** opens the site → clicks **Create Room**
2. A 6-character room code appears (e.g., `ABCD12`)
3. **Player 2** opens the site → enters the code → clicks **Join**
4. Both players see the lobby — click **Ready**
5. Host clicks **Start Game**
6. Draft your team, see results, rematch!

**Invite link** — also works: `http://your-site/#join/ABCD12`

---

## Project Structure

```
Party Hub/
├── index.html               ← SPA shell, all views render here
├── styles/
│   ├── main.css             ← Design system (variables, reset, typography)
│   ├── components.css       ← Buttons, cards, modals, toasts, player UI
│   └── games.css            ← Game board, entity cards, results screen
├── src/
│   ├── app.js               ← Bootstrap, routing, home view
│   ├── core/
│   │   ├── event-bus.js     ← Pub/sub event system
│   │   ├── game-registry.js ← Register/lookup game modules
│   │   ├── game-lifecycle.js← Authoritative game state machine
│   │   ├── room-manager.js  ← Room state, player slots, ready logic
│   │   ├── multiplayer.js   ← PeerJS transport abstraction
│   │   ├── player-manager.js← Guest identity (UUID + display name)
│   │   ├── scoring.js       ← Shared scoring helpers
│   │   └── persistence.js   ← localStorage adapter
│   ├── shared/
│   │   ├── timer.js         ← Countdown timer component
│   │   ├── results.js       ← Results screen helpers
│   │   └── validators.js    ← Message/action validation
│   ├── games/
│   │   └── budget-draft/
│   │       ├── index.js     ← Full game module (UI + contract)
│   │       ├── rules.js     ← Rules engine + state machine
│   │       └── data/pools.js← 140+ entities across 7 topics
│   └── ui/
│       ├── navigation.js    ← Hash-based SPA router
│       ├── game-library.js  ← Game browser view
│       ├── lobby.js         ← Room lobby view
│       └── diagnostics.js   ← Dev panel (Ctrl+Shift+D)
└── tests/
    ├── core/core.test.js    ← Core system tests
    └── games/budget-draft.test.js ← Budget Draft tests
```

---

## Developer Tools

Press **Ctrl+Shift+D** to toggle the diagnostics panel showing:
- Room ID, Match ID, Player ID
- Host/client role
- PeerJS connection state
- Current phase & state version
- Last sync time, recent errors

---

## Adding a New Game (Module Contract)

```js
export const MyGameModule = {
  metadata: {
    id: 'my-game',
    title: 'My Game',
    category: 'Draft & Build',
    description: '...',
    minPlayers: 2,
    maxPlayers: 2,
    estimatedDuration: '10 min',
    emoji: '🎯',
    tags: ['strategy'],
  },

  createInitialState(config, players) { /* return initial state */ },
  validateAction(state, action, playerId) { /* return { valid, reason } */ },
  applyAction(state, action, playerId) { /* return new state (immutable) */ },
  getNextPhase(state) { /* return next phase string */ },
  calculateResults(state) { /* return { winnerId, isTie, scores, breakdown } */ },
  isComplete(state) { /* return boolean */ },

  renderLobby(container, context) { /* render settings UI */ },
  renderGame(container, context) { /* render game board */ },
  renderResults(container, context) { /* render results */ },
};
```

Then in `src/app.js`:
```js
import { MyGameModule } from './games/my-game/index.js';
GameRegistry.register(MyGameModule);
```

---

## Running Tests

Open `tests/core/core.test.js` and `tests/games/budget-draft.test.js` in a test HTML:

```html
<script type="module">
  import './tests/core/core.test.js';
  import './tests/games/budget-draft.test.js';
</script>
```

Or run with Node (ES modules):
```bash
node --experimental-vm-modules tests/core/core.test.js
```

---

## Budget Draft — Topics & Entity Counts

| Topic       | Entities |
|-------------|---------|
| Cricket     | 22      |
| Football    | 21      |
| Superheroes | 20      |
| Anime       | 20      |
| Pokémon     | 20      |
| Actors      | 20      |
| Villains    | 20      |

---

## Known Limitations (Phase 1)

- PeerJS uses public signalling server — may be blocked on some corporate networks
- Different-network play requires WebRTC TURN relay (may fail on strict NAT)
- Host is trusted — no server-side anti-cheat
- No host migration (if host disconnects, game ends)
- Match history is local only (not synced between devices)

---

## Phase 2 Roadmap

- Five vs Five (Attack & Defend)
- Popularity Battle
- Blind Ranking
- Survival Inventory
- Higher or Lower

See `Party-Hub-Product-Technical-Blueprint-V1.md` for full roadmap.
"# Party-Hub" 
