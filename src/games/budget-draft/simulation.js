/**
 * simulation.js — Head-to-Head Squad Simulation Engine
 * Party Hub — YouTube-Style Match Clashes
 *
 * Simulates real, transparent, thrilling clashes between the two drafted squads:
 * - Football: 90-minute match with minute-by-minute goals, saves, assists, and final score.
 * - Cricket: 5-over super clash innings with ball-by-ball boundaries, wickets, and run chases.
 * - Superheroes/Villains/Anime: 5 arena duels with tactical counter advantages and battle log.
 * - Actors: Blockbuster box office showdown & Rotten Tomatoes score comparison.
 */

/** Random integer between min and max inclusive */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Football Match Simulator
 */
export function simulateFootballMatch(teamA, teamB, playerA, playerB) {
  const getRating = (team, role) => {
    return team
      .filter(p => p.role.toLowerCase().includes(role.toLowerCase()))
      .reduce((sum, p) => sum + p.value, 0);
  };

  const attA = getRating(teamA, 'forward') + getRating(teamA, 'striker') + 5;
  const midA = getRating(teamA, 'midfield') + 5;
  const defA = getRating(teamA, 'defender') + getRating(teamA, 'goalkeeper') + 5;

  const attB = getRating(teamB, 'forward') + getRating(teamB, 'striker') + 5;
  const midB = getRating(teamB, 'midfield') + 5;
  const defB = getRating(teamB, 'defender') + getRating(teamB, 'goalkeeper') + 5;

  // Chemistry bonus: has at least 1 defender/GK and 1 midfielder and 1 attacker
  const chemA = (defA > 5 && midA > 5 && attA > 5) ? 1.2 : 0.85;
  const chemB = (defB > 5 && midB > 5 && attB > 5) ? 1.2 : 0.85;

  const effAttA = attA * (midA / (midA + midB + 1)) * chemA;
  const effAttB = attB * (midB / (midA + midB + 1)) * chemB;

  // Simulate goals
  const goalsA = Math.max(0, Math.round((effAttA / (defB * 0.8)) * (Math.random() * 2.2 + 0.4)));
  const goalsB = Math.max(0, Math.round((effAttB / (defA * 0.8)) * (Math.random() * 2.2 + 0.4)));

  const commentary = [];
  const minutes = [12, 28, 41, 55, 69, 78, 87, 92];

  // Distribute goals into commentary
  const scorersA = teamA.filter(p => p.role.includes('Forward') || p.role.includes('Striker') || p.role.includes('Mid'));
  const scorersB = teamB.filter(p => p.role.includes('Forward') || p.role.includes('Striker') || p.role.includes('Mid'));

  for (let g = 0; g < goalsA; g++) {
    const min = minutes[randInt(0, minutes.length - 1)];
    const scorer = scorersA[randInt(0, scorersA.length - 1)]?.name || teamA[0]?.name || 'Attacker';
    commentary.push({
      minute: min,
      team: 'A',
      type: 'GOAL',
      text: `${min}' ⚽ GOAL! ${scorer} blasts it into the top corner for ${playerA.displayName}!`,
    });
  }

  for (let g = 0; g < goalsB; g++) {
    const min = minutes[randInt(0, minutes.length - 1)];
    const scorer = scorersB[randInt(0, scorersB.length - 1)]?.name || teamB[0]?.name || 'Attacker';
    commentary.push({
      minute: min,
      team: 'B',
      type: 'GOAL',
      text: `${min}' ⚽ GOAL! ${scorer} strikes clinical finish for ${playerB.displayName}!`,
    });
  }

  // Key saves & defense moments
  const gkA = teamA.find(p => p.role.includes('Goalkeeper'))?.name || 'Defense';
  const gkB = teamB.find(p => p.role.includes('Goalkeeper'))?.name || 'Defense';
  commentary.push({
    minute: 34,
    type: 'SAVE',
    text: `34' 🧤 SENSATIONAL SAVE! ${gkA} denies a certain goal!`,
  });
  commentary.push({
    minute: 73,
    type: 'SAVE',
    text: `73' 🧤 CLUTCH INTERCEPTION! ${gkB} fingertip stop preserves the scoreline!`,
  });

  commentary.sort((a, b) => a.minute - b.minute);

  // Tie breaker (penalties if tied)
  let penaltyWinner = null;
  let finalGoalsA = goalsA;
  let finalGoalsB = goalsB;

  if (finalGoalsA === finalGoalsB) {
    const penA = randInt(3, 5);
    const penB = penA === 5 ? 4 : (Math.random() > 0.5 ? penA + 1 : penA - 1);
    penaltyWinner = penA > penB ? playerA.id : playerB.id;
    commentary.push({
      minute: 120,
      type: 'PENALTIES',
      text: `120' 🎯 FULL TIME DRAW (${finalGoalsA}-${finalGoalsB})! Penalties shootout: ${playerA.displayName} ${penA} - ${penB} ${playerB.displayName}`,
    });
  }

  const winnerId = finalGoalsA > finalGoalsB ? playerA.id : (finalGoalsB > finalGoalsA ? playerB.id : penaltyWinner);

  return {
    scoreA: finalGoalsA,
    scoreB: finalGoalsB,
    winnerId,
    isTie: false,
    headline: `${finalGoalsA} - ${finalGoalsB}`,
    subheadline: winnerId === playerA.id ? `${playerA.displayName} wins the football clash!` : `${playerB.displayName} takes victory!`,
    commentary,
    stats: [
      { label: 'Attacking Rating', valA: Math.round(effAttA), valB: Math.round(effAttB) },
      { label: 'Defensive Strength', valA: defA, valB: defB },
      { label: 'Team Chemistry', valA: `${Math.round(chemA * 100)}%`, valB: `${Math.round(chemB * 100)}%` },
    ],
  };
}

/**
 * Cricket 5-Over Super Clash Simulator
 */
export function simulateCricketMatch(teamA, teamB, playerA, playerB) {
  const getPower = (team, role) => {
    return team
      .filter(p => p.role.toLowerCase().includes(role.toLowerCase()))
      .reduce((sum, p) => sum + p.value, 0);
  };

  const batA = getPower(teamA, 'bat') + getPower(teamA, 'all-round') + 10;
  const bowlA = getPower(teamA, 'bowl') + getPower(teamA, 'all-round') + 10;

  const batB = getPower(teamB, 'bat') + getPower(teamB, 'all-round') + 10;
  const bowlB = getPower(teamB, 'bowl') + getPower(teamB, 'all-round') + 10;

  // Innings 1: Team A bats
  const runsA = Math.round(35 + (batA / (bowlB + 5)) * randInt(18, 32));
  const wktsA = randInt(1, 4);

  // Innings 2: Team B chases Target = runsA + 1
  const target = runsA + 1;
  const chaseStrength = (batB / (bowlA + 5));
  const runsB = Math.round(34 + chaseStrength * randInt(18, 33));
  const wktsB = runsB >= target ? randInt(1, 4) : randInt(4, 5);

  const wonByA = runsA > runsB;
  const winnerId = wonByA ? playerA.id : playerB.id;

  const commentary = [
    { over: '1.2', text: `💥 FOUR! Superb cover drive through the covers!` },
    { over: '2.5', text: `🚀 MAXIMUM! Clean hit over deep mid-wicket for SIX!` },
    { over: '3.4', text: `☝️ OUT! Timber! Shattered stumps with deadly yorker!` },
    { over: '4.6', text: `⚡ Innings 1 ends: ${playerA.displayName} posts ${runsA}/${wktsA} in 5.0 overs!` },
    { over: 'Chase', text: `🎯 Target: ${target} runs needed off 30 deliveries.` },
    { over: '5.6', text: wonByA
      ? `🏆 Defense holds! ${playerA.displayName} defends total by ${runsA - runsB} runs!`
      : `🎉 BOUNDARY TO FINISH! ${playerB.displayName} chases down target with ${5 - wktsB} wickets in hand!`
    },
  ];

  return {
    scoreA: `${runsA}/${wktsA}`,
    scoreB: `${runsB}/${wktsB}`,
    winnerId,
    isTie: false,
    headline: wonByA ? `${playerA.displayName} won by ${runsA - runsB} runs` : `${playerB.displayName} won by ${5 - wktsB} wickets`,
    subheadline: `Target: ${target} · Final: ${runsA}/${wktsA} vs ${runsB}/${wktsB}`,
    commentary,
    stats: [
      { label: 'Batting Strength', valA: batA, valB: batB },
      { label: 'Bowling Arsenal', valA: bowlA, valB: bowlB },
      { label: 'Run Rate', valA: (runsA / 5).toFixed(1), valB: (runsB / 5).toFixed(1) },
    ],
  };
}

/**
 * Superheroes & Villains / Anime Arena Clash Simulator
 */
export function simulateArenaClash(teamA, teamB, playerA, playerB) {
  const rounds = [];
  let winsA = 0;
  let winsB = 0;

  const count = Math.min(teamA.length, teamB.length);
  for (let i = 0; i < count; i++) {
    const heroA = teamA[i];
    const heroB = teamB[i];

    const powerA = heroA.value + randInt(-2, 3);
    const powerB = heroB.value + randInt(-2, 3);

    const winner = powerA >= powerB ? playerA : playerB;
    if (powerA >= powerB) winsA++; else winsB++;

    rounds.push({
      round: i + 1,
      heroA: heroA.name,
      heroB: heroB.name,
      tierA: heroA.tier,
      tierB: heroB.tier,
      winnerName: winner.displayName,
      desc: powerA >= powerB
        ? `${heroA.name} overcomes ${heroB.name} with superior combat power!`
        : `${heroB.name} outmaneuvers ${heroA.name} in an epic clash!`,
    });
  }

  // Tiebreaker
  if (winsA === winsB) {
    if (Math.random() > 0.5) winsA++; else winsB++;
  }

  const winnerId = winsA > winsB ? playerA.id : playerB.id;

  return {
    scoreA: `${winsA} Duels`,
    scoreB: `${winsB} Duels`,
    winnerId,
    isTie: false,
    headline: `${winsA} - ${winsB} Arena Victories`,
    subheadline: winnerId === playerA.id ? `${playerA.displayName}'s champions prevail!` : `${playerB.displayName}'s champions dominate the arena!`,
    commentary: rounds.map(r => ({
      minute: r.round,
      text: `Round ${r.round}: ${r.heroA} (${r.tierA}) vs ${r.heroB} (${r.tierB}) ⚔️ ${r.desc}`,
    })),
    stats: [
      { label: 'Duels Won', valA: winsA, valB: winsB },
      { label: 'Total Power Index', valA: teamA.reduce((s, h) => s + h.value, 0), valB: teamB.reduce((s, h) => s + h.value, 0) },
    ],
  };
}

/**
 * Actors Cinema Blockbuster Pitch Simulator
 */
export function simulateBoxOfficeClash(teamA, teamB, playerA, playerB) {
  const boxA = teamA.reduce((s, a) => s + a.value * 12, randInt(120, 240));
  const boxB = teamB.reduce((s, a) => s + a.value * 12, randInt(120, 240));

  const rtA = Math.min(99, Math.round(teamA.reduce((s, a) => s + (a.tier === 'S' ? 20 : a.tier === 'A' ? 17 : 14), 10)));
  const rtB = Math.min(99, Math.round(teamB.reduce((s, a) => s + (a.tier === 'S' ? 20 : a.tier === 'A' ? 17 : 14), 10)));

  const totalA = boxA + rtA * 4;
  const totalB = boxB + rtB * 4;

  const winnerId = totalA >= totalB ? playerA.id : playerB.id;

  return {
    scoreA: `$${boxA}M`,
    scoreB: `$${boxB}M`,
    winnerId,
    isTie: false,
    headline: `$${boxA}M vs $${boxB}M Worldwide Gross`,
    subheadline: winnerId === playerA.id ? `${playerA.displayName}'s film produces a global blockbuster!` : `${playerB.displayName}'s film wins critics & box office!`,
    commentary: [
      { minute: 1, text: `🎬 Opening Weekend: Both star-studded productions enter the box office battle.` },
      { minute: 2, text: `🍅 Rotten Tomatoes: ${playerA.displayName} sits at ${rtA}% Certified Fresh vs ${playerB.displayName}'s ${rtB}%.` },
      { minute: 3, text: `🏆 Academy Awards Buzz: Global audience acclaim sweeps ${winnerId === playerA.id ? playerA.displayName : playerB.displayName} to victory!` },
    ],
    stats: [
      { label: 'Box Office Gross', valA: `$${boxA}M`, valB: `$${boxB}M` },
      { label: 'Rotten Tomatoes', valA: `${rtA}%`, valB: `${rtB}%` },
    ],
  };
}

/**
 * Dispatch simulation based on topic
 */
export function runMatchSimulation(topic, teamA, teamB, playerA, playerB) {
  if (topic === 'football') {
    return simulateFootballMatch(teamA, teamB, playerA, playerB);
  }
  if (topic === 'cricket') {
    return simulateCricketMatch(teamA, teamB, playerA, playerB);
  }
  if (topic === 'actors') {
    return simulateBoxOfficeClash(teamA, teamB, playerA, playerB);
  }
  // superheroes, anime, villains, pokemon
  return simulateArenaClash(teamA, teamB, playerA, playerB);
}
