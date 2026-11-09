/**
 * budget-draft.test.js — Budget Draft game module tests
 * Party Hub tests (vanilla JS, no framework)
 */

// ================================================================
// Test Harness (self-contained)
// ================================================================

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, message) {
  if (!condition) {
    failed++;
    results.push({ status: 'FAIL', message });
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passed++;
  results.push({ status: 'PASS', message });
  console.log(`✅ PASS: ${message}`);
}

function assertEquals(actual, expected, message) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  assert(ok, `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`);
}

async function test(name, fn) {
  console.group(`\n📋 ${name}`);
  try {
    await fn();
    console.log(`✓ ${name} — all assertions passed`);
  } catch (err) {
    if (!err.message?.startsWith('Assertion failed')) {
      failed++;
      results.push({ status: 'FAIL', message: `${name}: ${err.message}` });
      console.error(`❌ ${name} threw:`, err.message);
    }
  }
  console.groupEnd();
}

// ================================================================
// Test Players
// ================================================================

const PLAYER_A = { id: 'player-a', displayName: 'Alice', color: '#58a6ff' };
const PLAYER_B = { id: 'player-b', displayName: 'Bob', color: '#bc8cff' };
const PLAYERS = [PLAYER_A, PLAYER_B];

// ================================================================
// Tests
// ================================================================

async function runAllTests() {
  console.log('\n🧪 Running Budget Draft Tests...\n');

  const { BudgetDraftRules, DEFAULT_CONFIG } = await import('../../src/games/budget-draft/rules.js');
  const { BudgetDraftModule } = await import('../../src/games/budget-draft/index.js');

  // ---- 1. createInitialState ----
  await test('createInitialState — pool size, budgets, picks empty', async () => {
    const state = BudgetDraftRules.createInitialState({ budget: 100, rosterSize: 5, topic: 'cricket' }, PLAYERS);

    assert(Array.isArray(state.pool), 'Pool should be an array');
    assert(state.pool.length > 0 && state.pool.length <= 30, `Pool should be 1–30 entities (got ${state.pool.length})`);

    assertEquals(state.budgets['player-a'], 100, 'Player A should start with 100 budget');
    assertEquals(state.budgets['player-b'], 100, 'Player B should start with 100 budget');

    assertEquals(state.picks['player-a'], [], 'Player A picks should start empty');
    assertEquals(state.picks['player-b'], [], 'Player B picks should start empty');

    assertEquals(state.phase, 'picking', 'Initial phase should be picking');
    assertEquals(state.config.budget, 100, 'Config budget should be 100');
    assertEquals(state.config.rosterSize, 5, 'Config rosterSize should be 5');
  });

  // ---- 2. validateAction — wrong phase ----
  await test('validateAction — reject picks in non-picking phase', async () => {
    const state = BudgetDraftRules.createInitialState({}, PLAYERS);
    const entity = state.pool[0];

    // Tamper phase to 'reveal'
    const revealState = { ...state, phase: 'reveal' };
    const result = BudgetDraftRules.validateAction(revealState, { entityId: entity.id }, 'player-a');

    assert(!result.valid, 'Should reject pick in reveal phase');
    assert(typeof result.reason === 'string', 'Should provide a reason');
  });

  // ---- 3. validateAction — out of turn (snake mode) ----
  await test('validateAction — reject out-of-turn picks (snake)', async () => {
    const state = BudgetDraftRules.createInitialState({
      selectionMode: 'snake',
      budget: 100,
      rosterSize: 5,
    }, PLAYERS);

    const entity = state.pool[0];

    // Player A is first (currentTurn should be player-a)
    assertEquals(state.currentTurn, 'player-a', 'Player A should go first');

    // Player B tries to pick — not their turn
    const result = BudgetDraftRules.validateAction(state, { entityId: entity.id }, 'player-b');
    assert(!result.valid, 'Should reject out-of-turn pick');
    assert(result.reason.toLowerCase().includes('turn'), 'Reason should mention turn');
  });

  // ---- 4. validateAction — budget exceeded ----
  await test('validateAction — reject budget-exceeding picks', async () => {
    const state = BudgetDraftRules.createInitialState({
      budget: 5,
      rosterSize: 5,
      topic: 'superheroes',
    }, PLAYERS);

    // All superheroes cost more than 5 (cheapest are ~8), so any pick should fail
    const entity = state.pool.find(e => e.value > 5);
    if (!entity) {
      console.log('  (skipping — all entities cost ≤5 in this pool, adjust test data)');
      return;
    }

    const result = BudgetDraftRules.validateAction(state, { entityId: entity.id }, state.currentTurn);
    assert(!result.valid, 'Should reject pick that exceeds budget');
    assert(result.reason.toLowerCase().includes('budget'), 'Reason should mention budget');
  });

  // ---- 5. validateAction — duplicate pick ----
  await test('validateAction — reject duplicate picks', async () => {
    let state = BudgetDraftRules.createInitialState({ budget: 100, rosterSize: 5 }, PLAYERS);
    const entity = state.pool[0];

    // Player A picks it
    state = BudgetDraftRules.applyAction(state, { entityId: entity.id }, state.currentTurn);

    // Player B tries to pick the same entity
    const result = BudgetDraftRules.validateAction(state, { entityId: entity.id }, state.currentTurn);
    assert(!result.valid, 'Should reject picking an already-picked entity');
    assert(result.reason.toLowerCase().includes('already'), 'Reason should mention already picked');
  });

  // ---- 6. validateAction — roster full ----
  await test('validateAction — reject picks when roster is full', async () => {
    // rosterSize=1 so after one pick, roster is full
    let state = BudgetDraftRules.createInitialState({
      budget: 100,
      rosterSize: 1,
      selectionMode: 'simultaneous',
    }, PLAYERS);

    const entity = state.pool[0];

    // Player A picks their one entity
    state = BudgetDraftRules.applyAction(state, { entityId: entity.id }, 'player-a');

    // Player A tries to pick another (roster is full)
    const entity2 = state.pool.find(e => e.id !== entity.id);
    if (!entity2) return;

    const result = BudgetDraftRules.validateAction(state, { entityId: entity2.id }, 'player-a');
    assert(!result.valid, 'Should reject pick when roster is full');
  });

  // ---- 7. applyAction — deducts budget ----
  await test('applyAction — pick deducts budget correctly', async () => {
    const state = BudgetDraftRules.createInitialState({ budget: 100, rosterSize: 5 }, PLAYERS);
    const entity = state.pool.find(e => e.id === state.pool[0].id);
    const cost = entity.value;
    const firstPlayer = state.currentTurn;

    const newState = BudgetDraftRules.applyAction(state, { entityId: entity.id }, firstPlayer);

    assertEquals(newState.budgets[firstPlayer], 100 - cost, `Budget should decrease by entity cost (${cost})`);
    assert(newState.picks[firstPlayer].includes(entity.id), 'Entity should appear in player picks');
  });

  // ---- 8. applyAction — advances turn (snake) ----
  await test('applyAction — advances turn in snake mode', async () => {
    const state = BudgetDraftRules.createInitialState({
      budget: 100,
      rosterSize: 5,
      selectionMode: 'snake',
    }, PLAYERS);

    const firstPlayer = state.currentTurn;
    const secondPlayer = firstPlayer === 'player-a' ? 'player-b' : 'player-a';
    const entity = state.pool[0];

    const newState = BudgetDraftRules.applyAction(state, { entityId: entity.id }, firstPlayer);

    assertEquals(newState.currentTurn, secondPlayer, 'Turn should advance to second player after pick');
    assert(newState.turnIndex > state.turnIndex, 'Turn index should increment');
  });

  // ---- 9. applyAction — phase moves to reveal when rosters filled ----
  await test('applyAction — transitions to reveal when all rosters filled', async () => {
    // rosterSize=1, simultaneous — each player picks 1 entity
    let state = BudgetDraftRules.createInitialState({
      budget: 100,
      rosterSize: 1,
      selectionMode: 'simultaneous',
    }, PLAYERS);

    // Both pick one entity
    state = BudgetDraftRules.applyAction(state, { entityId: state.pool[0].id }, 'player-a');
    // After A picks in simultaneous, check if B still can
    if (state.phase !== 'reveal') {
      const entity2 = state.pool.find(e => e.id !== state.pool[0].id);
      state = BudgetDraftRules.applyAction(state, { entityId: entity2.id }, 'player-b');
    }

    assertEquals(state.phase, 'reveal', 'Phase should be "reveal" when all rosters are full');
    assert(BudgetDraftRules.isComplete(state), 'isComplete should return true in reveal phase');
  });

  // ---- 10. calculateResults — determines winner ----
  await test('calculateResults — determines winner correctly', async () => {
    // Build a state where player-a has an S-tier pick and player-b has a C-tier pick
    const state = BudgetDraftRules.createInitialState({ budget: 100, rosterSize: 1, selectionMode: 'simultaneous' }, PLAYERS);

    const sTierEntity = state.pool.find(e => e.tier === 'S');
    const cTierEntity = state.pool.find(e => e.tier === 'C' && e.id !== sTierEntity?.id);

    if (!sTierEntity || !cTierEntity) {
      // Can't guarantee S and C in a small pool, skip gracefully
      console.log('  (skipping winner test — pool lacks required S/C tiers, run again for different pool shuffle)');
      return;
    }

    // Manually set picks (bypass validation for unit test purposes)
    const manualState = {
      ...state,
      picks: { 'player-a': [sTierEntity.id], 'player-b': [cTierEntity.id] },
      budgets: { 'player-a': 100 - sTierEntity.value, 'player-b': 100 - cTierEntity.value },
      phase: 'reveal',
    };

    const results = BudgetDraftRules.calculateResults(manualState);

    assert(typeof results.scores === 'object', 'Results should include scores');
    assert(typeof results.breakdown === 'object', 'Results should include breakdown');
    assert('winnerId' in results || results.isTie, 'Results should have a winner or tie');
    assert(results.scores['player-a'] > results.scores['player-b'], 'Player A (S-tier) should outscore Player B (C-tier)');
    assertEquals(results.winnerId, 'player-a', 'Player A should be the winner');
    assert(!results.isTie, 'Should not be a tie');
  });

  // ---- 11. Rematch — state resets correctly ----
  await test('Module — metadata is complete', async () => {
    const meta = BudgetDraftModule.metadata;
    assert(typeof meta.id === 'string' && meta.id.length > 0, 'Module should have id');
    assert(typeof meta.title === 'string', 'Module should have title');
    assert(typeof meta.minPlayers === 'number', 'Module should have minPlayers');
    assert(typeof meta.maxPlayers === 'number', 'Module should have maxPlayers');
    assert(Array.isArray(meta.topics) && meta.topics.length > 0, 'Module should have topics');
    assert(typeof BudgetDraftModule.createInitialState === 'function', 'Module should have createInitialState');
    assert(typeof BudgetDraftModule.validateAction === 'function', 'Module should have validateAction');
    assert(typeof BudgetDraftModule.applyAction === 'function', 'Module should have applyAction');
    assert(typeof BudgetDraftModule.calculateResults === 'function', 'Module should have calculateResults');
    assert(typeof BudgetDraftModule.renderLobby === 'function', 'Module should have renderLobby');
    assert(typeof BudgetDraftModule.renderGame === 'function', 'Module should have renderGame');
    assert(typeof BudgetDraftModule.renderResults === 'function', 'Module should have renderResults');
  });

  // ---- Budget cannot go negative ----
  await test('Budget — cannot go negative (validation guards)', async () => {
    const state = BudgetDraftRules.createInitialState({ budget: 1, rosterSize: 5 }, PLAYERS);

    // Find any entity that costs more than 1
    const expensive = state.pool.find(e => e.value > 1);
    if (!expensive) return;

    const result = BudgetDraftRules.validateAction(state, { entityId: expensive.id }, state.currentTurn || 'player-a');
    assert(!result.valid, 'Should reject picks that would take budget negative');
  });

  // ---- Both players get same pool ----
  await test('Pool — both players see the same initial pool', async () => {
    const state = BudgetDraftRules.createInitialState({ budget: 100, rosterSize: 5, topic: 'football' }, PLAYERS);

    // The pool is shared — same entities visible to both
    const available = BudgetDraftRules.getAvailableEntities(state);
    assert(available.length === state.pool.length, 'All pool entities should be available initially');
    assert(available.every(e => state.pool.some(p => p.id === e.id)), 'Available entities should all be from the shared pool');
  });

  // ================================================================
  // Summary
  // ================================================================
  console.log('\n' + '='.repeat(50));
  console.log(`🧪 Budget Draft Tests: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('❌ Some tests failed');
  }
  console.log('='.repeat(50));

  return { passed, failed, results };
}

// Auto-run
runAllTests();
