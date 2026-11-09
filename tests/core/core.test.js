/**
 * core.test.js — Core system unit tests
 * Party Hub tests (vanilla JS, no framework)
 *
 * Run in browser: open tests/test-runner.html
 * Or in Node.js (ES modules): node --experimental-vm-modules tests/core/core.test.js
 */

// ================================================================
// Test Harness
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
// Mock localStorage
// ================================================================

const _store = {};
const mockLocalStorage = {
  getItem: (k) => _store[k] ?? null,
  setItem: (k, v) => { _store[k] = v; },
  removeItem: (k) => { delete _store[k]; },
  clear: () => { Object.keys(_store).forEach(k => delete _store[k]); },
};

// Override global if in browser
if (typeof window !== 'undefined') {
  // Tests run alongside app — use a namespaced store
} else {
  // Node environment — polyfill
  global.localStorage = mockLocalStorage;
  global.crypto = { randomUUID: () => `test-${Math.random().toString(36).slice(2)}` };
}

// ================================================================
// Import modules (ES module style - works in browser test runner)
// ================================================================

// Because this file may be loaded as a module in the browser test runner,
// we use dynamic imports relative to this file's location.

async function runAllTests() {
  console.log('\n🧪 Running Party Hub Core Tests...\n');

  // ---- 1. GameRegistry ----
  await test('GameRegistry — register, get, getAll', async () => {
    const { GameRegistry } = await import('../../src/core/game-registry.js');

    const fakeGame = {
      metadata: { id: 'test-game-1', title: 'Test Game', category: 'test' },
    };

    // Register
    GameRegistry.register(fakeGame);
    assert(GameRegistry.isRegistered('test-game-1'), 'Game should be registered');

    // Get
    const retrieved = GameRegistry.get('test-game-1');
    assert(retrieved === fakeGame, 'Get should return the same module');

    // GetAll should include it
    const all = GameRegistry.getAll();
    assert(all.some(g => g.metadata.id === 'test-game-1'), 'getAll should include registered game');

    // Duplicate registration — should warn but not throw
    GameRegistry.register(fakeGame);
    const all2 = GameRegistry.getAll();
    assertEquals(all2.filter(g => g.metadata.id === 'test-game-1').length, 1, 'Duplicate registration should not create duplicates');

    // IsRegistered false for unknown
    assert(!GameRegistry.isRegistered('nonexistent'), 'Unknown game should not be registered');

    GameRegistry.unregister('test-game-1');
  });

  // ---- 2. EventBus ----
  await test('EventBus — on, emit, off, once', async () => {
    const { EventBus } = await import('../../src/core/event-bus.js');

    let callCount = 0;
    const handler = (data) => { callCount += data.n; };

    EventBus.on('test:event', handler);
    EventBus.emit('test:event', { n: 1 });
    assertEquals(callCount, 1, 'Handler should be called once');

    EventBus.emit('test:event', { n: 2 });
    assertEquals(callCount, 3, 'Handler should be called again');

    EventBus.off('test:event', handler);
    EventBus.emit('test:event', { n: 10 });
    assertEquals(callCount, 3, 'Handler should not be called after off()');

    // Once
    let onceCalled = 0;
    EventBus.once('test:once', () => { onceCalled++; });
    EventBus.emit('test:once', {});
    EventBus.emit('test:once', {});
    assertEquals(onceCalled, 1, 'once() handler should only fire once');

    // Multiple listeners
    let a = 0, b = 0;
    EventBus.on('test:multi', () => a++);
    EventBus.on('test:multi', () => b++);
    EventBus.emit('test:multi', {});
    assertEquals(a, 1, 'First listener should fire');
    assertEquals(b, 1, 'Second listener should fire');
    EventBus.clear('test:multi');
    EventBus.clear('test:event');
    EventBus.clear('test:once');
  });

  // ---- 3. Player Identity ----
  await test('PlayerManager — generate, persist, load', async () => {
    const { PlayerManager, getAvatarInitials } = await import('../../src/core/player-manager.js');

    // Reset first
    PlayerManager.resetIdentity();

    const player = PlayerManager.getLocalPlayer();
    assert(typeof player.id === 'string' && player.id.length > 0, 'Player should have an id');
    assert(player.displayName.startsWith('Guest#'), 'Default name should start with Guest#');
    assert(typeof player.color === 'string' && player.color.startsWith('#'), 'Player should have a hex color');

    // Load is consistent
    const loaded = PlayerManager.getLocalPlayer();
    assertEquals(loaded.id, player.id, 'Same player should be returned on subsequent calls');

    // Update name
    const updated = PlayerManager.updateDisplayName('TestPlayer');
    assertEquals(updated.displayName, 'TestPlayer', 'Display name should update');

    // Initials
    assertEquals(getAvatarInitials('TestPlayer'), 'TE', 'Initials for TestPlayer should be TE');
    assertEquals(getAvatarInitials('Guest#1234'), 'GU', 'Initials for Guest#1234 should be GU');
    assertEquals(getAvatarInitials(''), '?', 'Empty name should return ?');

    PlayerManager.resetIdentity();
  });

  // ---- 4. Persistence ----
  await test('Persistence — save/load player, save/load history', async () => {
    const { Persistence } = await import('../../src/core/persistence.js');

    // Player
    const fakePlayer = { id: 'test-123', displayName: 'Tester', color: '#ff0000' };
    Persistence.savePlayer(fakePlayer);
    const loaded = Persistence.loadPlayer();
    assertEquals(loaded.id, fakePlayer.id, 'Loaded player id should match');
    assertEquals(loaded.displayName, fakePlayer.displayName, 'Loaded player name should match');

    // Match history
    const record = {
      matchId: 'match-1',
      gameId: 'budget-draft',
      playedAt: Date.now(),
      players: [{ id: 'test-123', displayName: 'Tester' }],
      results: { winnerId: 'test-123', isTie: false, scores: {} },
    };
    Persistence.saveMatchRecord(record);
    const history = Persistence.loadMatchHistory();
    assert(history.length >= 1, 'History should have at least one record');
    assertEquals(history[0].matchId, 'match-1', 'Most recent record should be first');

    Persistence.clearMatchHistory();
    const cleared = Persistence.loadMatchHistory();
    assertEquals(cleared.length, 0, 'History should be empty after clear');
  });

  // ---- 5. Message Validation ----
  await test('Validators — valid message passes, invalid fails, oversized fails', async () => {
    const { validateMessage, validateMessageShape, isValidRoomCode, validateDisplayName } = await import('../../src/shared/validators.js');

    // Valid message
    const valid = { type: 'HELLO', roomId: 'ABC123', playerId: 'player-1', timestamp: Date.now() };
    const r1 = validateMessage(valid);
    assert(r1.valid, 'Valid message should pass');

    // Missing type
    const noType = { roomId: 'ABC123', playerId: 'player-1' };
    const r2 = validateMessage(noType);
    assert(!r2.valid, 'Message without type should fail');
    assert(r2.reason.includes('type'), 'Reason should mention type');

    // Missing roomId
    const noRoom = { type: 'HELLO', playerId: 'player-1' };
    const r3 = validateMessage(noRoom);
    assert(!r3.valid, 'Message without roomId should fail');

    // Missing playerId
    const noPlayer = { type: 'HELLO', roomId: 'ABC123' };
    const r4 = validateMessage(noPlayer);
    assert(!r4.valid, 'Message without playerId should fail');

    // Oversized message
    const bigMsg = { type: 'TEST', roomId: 'ABC123', playerId: 'p1', data: 'x'.repeat(200 * 1024) };
    const r5 = validateMessage(bigMsg);
    assert(!r5.valid, 'Oversized message should fail');
    assert(r5.reason.toLowerCase().includes('large') || r5.reason.toLowerCase().includes('size'), 'Reason should mention size');

    // Room code validation
    assert(isValidRoomCode('ABC123'), 'Valid 6-char code should pass');
    assert(!isValidRoomCode('AB123'), 'Short code should fail');
    assert(!isValidRoomCode('abc123'), 'Lowercase code should fail (needs toUpperCase first)');

    // Display name validation
    assert(validateDisplayName('TestPlayer').valid, 'Normal name should be valid');
    assert(!validateDisplayName('').valid, 'Empty name should be invalid');
    assert(!validateDisplayName('a'.repeat(25)).valid, 'Too long name should be invalid');
  });

  // ---- 6. buildMessage ----
  await test('buildMessage — creates correct envelope', async () => {
    const { buildMessage } = await import('../../src/core/multiplayer.js');

    const msg = buildMessage('HELLO', 'ROOM01', 'player-1', { foo: 'bar' });

    assertEquals(msg.type, 'HELLO', 'type should match');
    assertEquals(msg.roomId, 'ROOM01', 'roomId should match');
    assertEquals(msg.playerId, 'player-1', 'playerId should match');
    assert(typeof msg.actionId === 'string', 'actionId should be a string');
    assert(typeof msg.timestamp === 'number', 'timestamp should be a number');
    assertEquals(msg.payload.foo, 'bar', 'payload should be passed through');
    assert(msg.timestamp <= Date.now(), 'timestamp should be in the past or now');
  });

  // ================================================================
  // Print Summary
  // ================================================================
  console.log('\n' + '='.repeat(50));
  console.log(`🧪 Test Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('❌ Some tests failed — see above for details');
  }
  console.log('='.repeat(50));

  return { passed, failed, results };
}

// Auto-run if this is the entry point
export { runAllTests };

// If loaded directly (not as module in test runner), run immediately
if (typeof document !== 'undefined' && document.currentScript) {
  runAllTests();
}
