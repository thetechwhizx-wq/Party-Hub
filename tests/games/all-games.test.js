/**
 * all-games.test.js — Test suite for all Party Hub game modules & Simulation Engine
 */

import { FiveVsFiveModule } from '../../src/games/five-vs-five/index.js';
import { PopularityBattleModule } from '../../src/games/popularity-battle/index.js';
import { BlindRankingModule } from '../../src/games/blind-ranking/index.js';
import { SurvivalInventoryModule } from '../../src/games/survival-inventory/index.js';
import { CounterPickModule } from '../../src/games/counter-pick/index.js';
import { runMatchSimulation } from '../../src/games/budget-draft/simulation.js';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error(`❌ FAIL: ${msg}`);
    throw new Error(msg);
  }
  passed++;
  console.log(`✅ PASS: ${msg}`);
}

const PLAYERS = [
  { id: 'p1', displayName: 'Player 1' },
  { id: 'p2', displayName: 'Player 2' },
];

async function runTests() {
  console.log('\n🧪 Running All Games & Simulation Engine Tests...\n');

  // 1. Five vs Five
  console.log('\n--- 1. Five vs Five ---');
  const f5State = FiveVsFiveModule.createInitialState({ topic: 'superheroes' }, PLAYERS);
  assert(f5State.pool.length === 10, 'Pool should have 10 entities');
  assert(f5State.scenario && f5State.scenario.title, 'Scenario should be assigned');
  assert(f5State.phase === 'draft', 'Initial phase should be draft');

  const draftAction = FiveVsFiveModule.applyAction(f5State, { entityId: f5State.pool[0].id }, 'p1');
  assert(draftAction.defenderPicks.length === 1, 'Defender should have 1 pick');

  // 2. Popularity Battle
  console.log('\n--- 2. Popularity Battle ---');
  const popState = PopularityBattleModule.createInitialState({}, PLAYERS);
  assert(popState.questions.length === 5, 'Should have 5 comparison questions');
  const popAction1 = PopularityBattleModule.applyAction(popState, { choice: 'A' }, 'p1');
  const popAction2 = PopularityBattleModule.applyAction(popAction1, { choice: 'B' }, 'p2');
  assert(popAction2.revealed === true, 'Round should be revealed when both answer');

  // 3. Blind Ranking
  console.log('\n--- 3. Blind Ranking ---');
  const brState = BlindRankingModule.createInitialState({}, PLAYERS);
  assert(brState.items.length === 5, 'Should have 5 items to rank');
  const brAction = BlindRankingModule.applyAction(brState, { rank: 1 }, 'p1');
  assert(brAction.rankings['p1'][1] !== null, 'Slot #1 should be assigned');

  // 4. Survival Inventory
  console.log('\n--- 4. Survival Inventory ---');
  const survState = SurvivalInventoryModule.createInitialState({}, PLAYERS);
  assert(survState.budgets['p1'] === 100, 'Starting budget should be $100');
  const buyAction = SurvivalInventoryModule.applyAction(survState, { itemId: 'water-filter' }, 'p1');
  assert(buyAction.inventories['p1'].includes('water-filter'), 'Item should be in backpack');
  assert(buyAction.budgets['p1'] === 80, 'Budget should be reduced to $80');

  // 5. Counter-Pick Duel
  console.log('\n--- 5. Counter-Pick Duel ---');
  const cpState = CounterPickModule.createInitialState({}, PLAYERS);
  assert(cpState.round === 1, 'Should start at round 1');
  const cpLead = CounterPickModule.applyAction(cpState, { heroId: cpState.heroes[0].id }, 'p1');
  assert(cpLead.leadPick !== null, 'Lead pick should be set');
  const cpCounter = CounterPickModule.applyAction(cpLead, { heroId: cpState.heroes[1].id }, 'p2');
  assert(cpCounter.round === 2, 'Should advance to round 2');

  // 6. Head-to-Head Simulation Engine
  console.log('\n--- 6. Match Simulation Engine ---');
  const teamA = [
    { name: 'Messi', role: 'Forward', value: 20, tier: 'S' },
    { name: 'De Bruyne', role: 'Midfielder', value: 16, tier: 'S' },
    { name: 'Van Dijk', role: 'Defender', value: 14, tier: 'A' },
  ];
  const teamB = [
    { name: 'Ronaldo', role: 'Forward', value: 20, tier: 'S' },
    { name: 'Bellingham', role: 'Midfielder', value: 17, tier: 'S' },
    { name: 'Alisson', role: 'Goalkeeper', value: 14, tier: 'A' },
  ];

  const footSim = runMatchSimulation('football', teamA, teamB, PLAYERS[0], PLAYERS[1]);
  assert(footSim.headline.includes('-'), 'Football headline should show scoreline');
  assert(footSim.commentary.length > 0, 'Football should have commentary');
  assert(footSim.winnerId !== undefined, 'Football should produce a winner');

  const cricSim = runMatchSimulation('cricket', teamA, teamB, PLAYERS[0], PLAYERS[1]);
  assert(cricSim.headline.includes('won'), 'Cricket headline should declare winner');
  assert(cricSim.commentary.length > 0, 'Cricket should have commentary');

  console.log('\n' + '='.repeat(50));
  console.log(`🎉 All New Games & Simulation Engine Tests Passed: ${passed} passed, ${failed} failed!`);
  console.log('='.repeat(50));
}

runTests();
