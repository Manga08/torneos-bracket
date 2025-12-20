import type { Participant, Match } from '@/types/database';

// Make BracketMatch fully compatible with Match for easier usage
interface BracketMatch extends Match {
  id: string; // Required
  created_at: string; // Required
}

export const generateSingleEliminationMatches = (
  tournamentId: string,
  participants: Participant[],
  hasThirdPlace: boolean = false,
): BracketMatch[] => {
  const matches: BracketMatch[] = [];
  const count = participants.length;

  // Encontrar la potencia de 2 más cercana superior o igual
  const size = Math.pow(2, Math.ceil(Math.log2(count)));
  const totalRounds = Math.log2(size);

  // Mapa para guardar referencias a los partidos de la siguiente ronda
  // key: `round-matchIndex` -> value: matchId (o objeto temporal)
  const nextRoundMap = new Map<string, string>();

  // Generamos IDs temporales para poder vincularlos
  // En una implementación real con DB, podríamos necesitar insertar por fases
  // O usar UUIDs generados en el cliente.

  // Vamos a generar UUIDs temporales simples para la lógica de vinculación
  // (En producción usaríamos crypto.randomUUID())
  const generateUUID = () => crypto.randomUUID();
  const now = new Date().toISOString();

  // Generamos desde la final hacia atrás para tener los IDs de "next_match"
  for (let round = totalRounds; round >= 1; round--) {
    const matchesInRound = Math.pow(2, totalRounds - round);

    for (let matchIdx = 0; matchIdx < matchesInRound; matchIdx++) {
      const matchId = generateUUID();
      const nextMatchId =
        round < totalRounds ? nextRoundMap.get(`${round + 1}-${Math.floor(matchIdx / 2)}`) : null;

      const match: BracketMatch = {
        id: matchId,
        created_at: now,
        tournament_id: tournamentId,
        round_number: round,
        match_number: matchIdx + 1,
        stage: 'main',
        participant_a_id: null,
        participant_b_id: null,
        score_a: 0,
        score_b: 0,
        winner_id: null,
        status: 'pending',
        next_match_id: nextMatchId || null,
      };

      matches.push(match);
      nextRoundMap.set(`${round}-${matchIdx}`, matchId);
    }
  }

  // 3rd Place Match Logic
  if (hasThirdPlace && totalRounds > 1) {
    // The semi-finals are at round = totalRounds - 1
    // We need to find the two semi-final matches
    const semiFinalRound = totalRounds - 1;
    const semiFinalMatches = matches.filter((m) => m.round_number === semiFinalRound);

    if (semiFinalMatches.length === 2) {
      const thirdPlaceMatchId = generateUUID();
      const thirdPlaceMatch: BracketMatch = {
        id: thirdPlaceMatchId,
        created_at: now,
        tournament_id: tournamentId,
        round_number: totalRounds, // Same visual level as final usually, or handled separately
        match_number: 2, // Final is 1, this is 2
        stage: 'bronze', // Special stage for 3rd place
        participant_a_id: null,
        participant_b_id: null,
        score_a: 0,
        score_b: 0,
        winner_id: null,
        status: 'pending',
        next_match_id: null,
      };
      matches.push(thirdPlaceMatch);

      // Link semi-finals losers to this match
      semiFinalMatches.forEach((m) => {
        m.loser_match_id = thirdPlaceMatchId;
      });
    }
  }

  // Asignar participantes a la primera ronda (Round 1)
  // Ordenamos los partidos de la ronda 1 para llenarlos
  const round1Matches = matches
    .filter((m) => m.round_number === 1)
    .sort((a, b) => a.match_number - b.match_number);

  // Ordenar participantes por seed para asegurar que se colocan en los slots correctos visualmente
  const sortedParticipants = [...participants].sort((a, b) => (a.seed || 0) - (b.seed || 0));

  // Llenamos los slots
  sortedParticipants.forEach((participant, index) => {
    const matchIndex = Math.floor(index / 2);
    if (matchIndex < round1Matches.length) {
      const match = round1Matches[matchIndex];
      if (index % 2 === 0) {
        match.participant_a_id = participant.id;
      } else {
        match.participant_b_id = participant.id;
      }
    }
  });

  // Manejo de BYES (Pases directos)
  // Si un partido de ronda 1 tiene solo un participante, ese participante pasa automáticamente
  round1Matches.forEach((match) => {
    if (match.participant_a_id && !match.participant_b_id) {
      match.winner_id = match.participant_a_id;
      match.status = 'completed';
      // Aquí deberíamos propagar al siguiente partido, pero eso requiere lógica de actualización recursiva
      // Por simplicidad, lo dejaremos para que el sistema lo maneje o el usuario lo actualice
      // O idealmente, lo manejamos aquí:
      propagateWinner(matches, match);
    } else if (!match.participant_a_id && match.participant_b_id) {
      // Caso raro si se llenan en orden, pero posible
      match.winner_id = match.participant_b_id;
      match.status = 'completed';
      propagateWinner(matches, match);
    }
  });

  return matches;
};

const propagateWinner = (allMatches: BracketMatch[], completedMatch: BracketMatch) => {
  if (!completedMatch.next_match_id || !completedMatch.winner_id) return;

  const nextMatch = allMatches.find((m) => m.id === completedMatch.next_match_id);
  if (nextMatch) {
    // Determinar si viene del slot A (par) o B (impar) en la ronda anterior
    // La lógica de vinculación fue: matchIdx -> nextMatchIdx = floor(matchIdx / 2)
    // Si matchIdx es par (0, 2, 4...) va al slot A del siguiente
    // Si matchIdx es impar (1, 3, 5...) va al slot B del siguiente
    // match_number es 1-based en nuestro código
    const isSlotA = (completedMatch.match_number - 1) % 2 === 0;

    if (isSlotA) {
      nextMatch.participant_a_id = completedMatch.winner_id;
    } else {
      nextMatch.participant_b_id = completedMatch.winner_id;
    }
  }
};

export const generateDoubleEliminationMatches = (
  tournamentId: string,
  participants: Participant[],
): BracketMatch[] => {
  const count = participants.length;
  // Fallback for small brackets
  if (count < 4) {
    const simple = generateSingleEliminationMatches(tournamentId, participants);
    simple.forEach((m) => (m.stage = 'main')); // Keep as main/single elim
    return simple;
  }

  const size = Math.pow(2, Math.ceil(Math.log2(count)));
  const totalUpperRounds = Math.log2(size);
  const generateUUID = () => crypto.randomUUID();
  const now = new Date().toISOString();

  // 1. Generate Upper Bracket (Full Tree)
  // We reuse the single elim logic but we need to capture the matches to link them later
  // We'll reimplement a cleaner version here to have full control over IDs
  const upperMatches: BracketMatch[] = [];
  const upperMap = new Map<string, BracketMatch>(); // "round-matchIdx" -> Match

  for (let r = totalUpperRounds; r >= 1; r--) {
    const matchesInRound = Math.pow(2, totalUpperRounds - r);
    for (let i = 0; i < matchesInRound; i++) {
      const matchId = generateUUID();
      const nextMatchId =
        r < totalUpperRounds ? upperMap.get(`${r + 1}-${Math.floor(i / 2)}`)?.id : null; // Will be linked to Grand Final later

      const match: BracketMatch = {
        id: matchId,
        created_at: now,
        tournament_id: tournamentId,
        round_number: r,
        match_number: i + 1,
        stage: 'upper',
        participant_a_id: null,
        participant_b_id: null,
        score_a: 0,
        score_b: 0,
        winner_id: null,
        status: 'pending',
        next_match_id: nextMatchId || null,
        loser_match_id: null, // Will be linked to Lower Bracket
      };
      upperMatches.push(match);
      upperMap.set(`${r}-${i}`, match);
    }
  }

  // Fill Upper Round 1 with participants
  const upperRound1 = upperMatches
    .filter((m) => m.round_number === 1)
    .sort((a, b) => a.match_number - b.match_number);
  const sortedParticipants = [...participants].sort((a, b) => (a.seed || 0) - (b.seed || 0));

  sortedParticipants.forEach((participant, index) => {
    const matchIndex = Math.floor(index / 2);
    if (matchIndex < upperRound1.length) {
      const match = upperRound1[matchIndex];
      if (index % 2 === 0) match.participant_a_id = participant.id;
      else match.participant_b_id = participant.id;
    }
  });

  // 2. Generate Lower Bracket
  // Total Lower Rounds = 2 * (Total Upper Rounds - 1)
  // Example 8 teams (3 upper rounds): Lower rounds = 2 * 2 = 4 rounds.
  // R1 (4 matches) -> Losers from Upper R1
  // R2 (2 matches) -> Winners Lower R1 + Losers Upper R2
  // R3 (1 match)   -> Winners Lower R2
  // R4 (1 match)   -> Winners Lower R3 + Loser Upper R3 (Upper Final)

  const lowerMatches: BracketMatch[] = [];
  const lowerMap = new Map<string, BracketMatch>(); // "round-matchIdx" -> Match
  const totalLowerRounds = 2 * (totalUpperRounds - 1);

  for (let r = totalLowerRounds; r >= 1; r--) {
    // Calculate number of matches in this lower round
    // R1: size/4 (same as Upper R1 / 2)
    // R2: size/4
    // R3: size/8
    // R4: size/8
    // ...
    const power = Math.ceil(r / 2);
    const matchesInRound = size / Math.pow(2, power + 1);

    for (let i = 0; i < matchesInRound; i++) {
      const matchId = generateUUID();
      // Next match logic for Lower Bracket
      // If r is odd (1, 3...), winners go to next round (r+1) which has SAME number of matches.
      //   Usually they map 1:1 or with a specific pattern.
      // If r is even (2, 4...), winners go to next round (r+1) which has HALF matches.

      let nextMatchId: string | null = null;
      if (r < totalLowerRounds) {
        if (r % 2 !== 0) {
          // Odd round (e.g. R1 -> R2). Same number of matches.
          // Match i goes to Match i in next round (usually, or crossed)
          nextMatchId = lowerMap.get(`${r + 1}-${i}`)?.id || null;
        } else {
          // Even round (e.g. R2 -> R3). Half matches.
          // Match i goes to Match floor(i/2) in next round
          nextMatchId = lowerMap.get(`${r + 1}-${Math.floor(i / 2)}`)?.id || null;
        }
      }

      const match: BracketMatch = {
        id: matchId,
        created_at: now,
        tournament_id: tournamentId,
        round_number: r,
        match_number: i + 1,
        stage: 'lower',
        participant_a_id: null,
        participant_b_id: null,
        score_a: 0,
        score_b: 0,
        winner_id: null,
        status: 'pending',
        next_match_id: nextMatchId || null,
      };
      lowerMatches.push(match);
      lowerMap.set(`${r}-${i}`, match);
    }
  }

  // 3. Link Upper Losers to Lower Bracket
  // Upper R1 Losers -> Lower R1 (Top feed)
  // Upper R2 Losers -> Lower R2 (Side feed)
  // Upper R3 Losers -> Lower R4 (Side feed)
  // ...

  // Upper R1 -> Lower R1
  const upperR1 = upperMatches
    .filter((m) => m.round_number === 1)
    .sort((a, b) => a.match_number - b.match_number);
  const lowerR1 = lowerMatches
    .filter((m) => m.round_number === 1)
    .sort((a, b) => a.match_number - b.match_number);

  // Mapping logic:
  // Upper R1 match i loser -> Lower R1 match floor(i/2).
  // Since Lower R1 has half the matches of Upper R1.
  // Slot A if i is even, Slot B if i is odd.
  upperR1.forEach((uMatch, i) => {
    const lMatchIndex = Math.floor(i / 2);
    if (lMatchIndex < lowerR1.length) {
      uMatch.loser_match_id = lowerR1[lMatchIndex].id;
      // We don't set participant_id here, it happens dynamically when advancing
    }
  });

  // Upper R(k) Losers -> Lower R(2k-2) for k >= 2
  // e.g. Upper R2 -> Lower R2
  //      Upper R3 -> Lower R4
  //      Upper R4 -> Lower R6
  for (let k = 2; k <= totalUpperRounds; k++) {
    const upperRoundK = upperMatches
      .filter((m) => m.round_number === k)
      .sort((a, b) => a.match_number - b.match_number);

    // Target Lower Round is 2*k - 2
    // Exception: The Upper Final (last round) loser goes to the Lower Final (last round)
    // Upper Final is round 'totalUpperRounds'.
    // Lower Final is round 'totalLowerRounds'.
    // Formula 2*k - 2 works: 2*3 - 2 = 4. Correct.

    const targetLowerRoundNum = 2 * k - 2;
    const lowerTargetRound = lowerMatches
      .filter((m) => m.round_number === targetLowerRoundNum)
      .sort((a, b) => a.match_number - b.match_number);

    upperRoundK.forEach((uMatch, i) => {
      // In these rounds, the number of matches in Upper R(k) equals matches in Lower R(2k-2).
      // So mapping is 1:1.
      // Usually they flip order to avoid rematches, but simple 1:1 for now.
      if (i < lowerTargetRound.length) {
        uMatch.loser_match_id = lowerTargetRound[i].id;
      }
    });
  }

  // 4. Grand Final
  const upperFinal = upperMatches.find((m) => m.round_number === totalUpperRounds);
  const lowerFinal = lowerMatches.find((m) => m.round_number === totalLowerRounds);

  const grandFinal: BracketMatch = {
    id: generateUUID(),
    created_at: now,
    tournament_id: tournamentId,
    round_number: totalUpperRounds + 1, // Sequential to Upper Bracket
    match_number: 1,
    stage: 'final',
    participant_a_id: null, // Winner Upper Final
    participant_b_id: null, // Winner Lower Final
    score_a: 0,
    score_b: 0,
    winner_id: null,
    status: 'pending',
    next_match_id: null,
  };

  if (upperFinal) upperFinal.next_match_id = grandFinal.id || null;
  if (lowerFinal) lowerFinal.next_match_id = grandFinal.id || null;

  return [...upperMatches, ...lowerMatches, grandFinal];
};

export const generateSwissMatches = (
  tournamentId: string,
  participants: Participant[],
): BracketMatch[] => {
  const matches: BracketMatch[] = [];
  const count = participants.length;
  // Standard Swiss rounds: ceil(log2(N))
  const totalRounds = Math.ceil(Math.log2(count));
  const matchesPerRound = Math.floor(count / 2);
  const generateUUID = () => crypto.randomUUID();
  const now = new Date().toISOString();

  for (let r = 1; r <= totalRounds; r++) {
    for (let i = 0; i < matchesPerRound; i++) {
      matches.push({
        id: generateUUID(),
        created_at: now,
        tournament_id: tournamentId,
        round_number: r,
        match_number: i + 1,
        stage: 'swiss',
        participant_a_id: null,
        participant_b_id: null,
        score_a: 0,
        score_b: 0,
        winner_id: null,
        status: 'pending',
        next_match_id: null,
      });
    }
  }

  // Fill Round 1 for preview
  const round1Matches = matches.filter((m) => m.round_number === 1);
  participants.forEach((p, idx) => {
    const matchIdx = Math.floor(idx / 2);
    if (matchIdx < round1Matches.length) {
      if (idx % 2 === 0) round1Matches[matchIdx].participant_a_id = p.id;
      else round1Matches[matchIdx].participant_b_id = p.id;
    }
  });

  return matches;
};

export const generateGroupStageMatches = (
  tournamentId: string,
  participants: Participant[],
): BracketMatch[] => {
  // Simple implementation:
  // 1. Divide participants into groups of 4 (approx)
  // 2. Generate Round Robin matches for each group
  // 3. Generate a Single Elim bracket for the top 2 of each group (Playoffs)

  const matches: BracketMatch[] = [];
  const generateUUID = () => crypto.randomUUID();
  const now = new Date().toISOString();

  // Determine number of groups (aim for 4 per group)
  const count = participants.length;
  const groupCount = Math.max(1, Math.ceil(count / 4));

  // Assign participants to groups
  const groups: Participant[][] = Array.from({ length: groupCount }, () => []);
  participants.forEach((p, i) => {
    groups[i % groupCount].push(p);
  });

  // Generate Group Stage Matches (Round Robin)
  groups.forEach((group, groupIndex) => {
    const groupName = String.fromCharCode(65 + groupIndex); // Group A, B, C...

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        matches.push({
          id: generateUUID(),
          created_at: now,
          tournament_id: tournamentId,
          round_number: 1, // All group matches are "Round 1" conceptually or we can use rounds
          match_number: matches.length + 1,
          stage: `Group ${groupName}`,
          participant_a_id: group[i].id,
          participant_b_id: group[j].id,
          score_a: 0,
          score_b: 0,
          winner_id: null,
          status: 'pending',
          next_match_id: null,
        });
      }
    }
  });

  // Generate Playoffs (Single Elim)
  // Assuming top 2 advance
  const advancingCount = groupCount * 2;
  // Create dummy participants for playoffs preview
  const playoffParticipants = Array.from({ length: advancingCount }, (_, i) => ({
    id: `winner-${i}`,
    tournament_id: tournamentId,
    name: `Winner/Runner-up Group ${String.fromCharCode(65 + Math.floor(i / 2))}`,
    seed: i + 1,
    created_at: new Date().toISOString(),
    metadata: {},
  }));

  const playoffMatches = generateSingleEliminationMatches(tournamentId, playoffParticipants);
  playoffMatches.forEach((m) => {
    m.stage = 'playoffs';
    // Offset round numbers to appear after groups? Or keep as separate stage.
    // Let's keep as separate stage 'playoffs' starting at Round 1
  });

  return [...matches, ...playoffMatches];
};

export const generateRoundRobinMatches = (
  tournamentId: string,
  participants: Participant[],
  options?: { doubleRoundRobin?: boolean; stage?: string },
): BracketMatch[] => {
  const matches: BracketMatch[] = [];
  const generateUUID = () => crypto.randomUUID();
  const now = new Date().toISOString();
  const stage = options?.stage ?? 'league';

  // 1. Sort participants by seed (deterministic)
  // Fallback to created_at or name if seed is missing, to ensure determinism
  const sortedParticipants = [...participants].sort((a, b) => {
    // Treat null seed as Infinity so they go to the bottom
    const seedA = a.seed !== null && a.seed !== undefined ? a.seed : Number.MAX_SAFE_INTEGER;
    const seedB = b.seed !== null && b.seed !== undefined ? b.seed : Number.MAX_SAFE_INTEGER;

    if (seedA !== seedB) {
      return seedA - seedB;
    }

    if (a.created_at && b.created_at && a.created_at !== b.created_at) {
      return a.created_at.localeCompare(b.created_at);
    }
    return a.name.localeCompare(b.name);
  });

  // 2. Handle odd number of participants (Circle Method)
  // If odd, add a dummy "BYE" participant.
  const n = sortedParticipants.length;
  const hasBye = n % 2 !== 0;
  const workingParticipants = hasBye
    ? [...sortedParticipants, { id: 'BYE' } as Participant]
    : [...sortedParticipants];

  const totalTeams = workingParticipants.length; // Always even now
  const roundsPerCycle = totalTeams - 1;
  const matchesPerRound = totalTeams / 2;

  // 3. Generate Rounds (Circle Method)
  // We fix the first team and rotate the rest.
  // Indices: 0, 1, 2, 3, ... totalTeams-1
  // Fixed: index 0.
  // Rotating: 1 to totalTeams-1.

  const generateCycle = (isSecondLeg: boolean) => {
    const cycleMatches: BracketMatch[] = [];
    // We need to clone the array to rotate it without affecting the original if we were to reuse it,
    // but here we just calculate indices dynamically or rotate a local array.
    // Let's use a local array of indices to rotate.
    let roundIndices = workingParticipants.map((_, i) => i);

    for (let round = 0; round < roundsPerCycle; round++) {
      const roundNum = isSecondLeg ? round + 1 + roundsPerCycle : round + 1;

      for (let i = 0; i < matchesPerRound; i++) {
        const homeIdx = roundIndices[i];
        const awayIdx = roundIndices[totalTeams - 1 - i];

        const home = workingParticipants[homeIdx];
        const away = workingParticipants[awayIdx];

        // Skip BYE matches
        if (home.id === 'BYE' || away.id === 'BYE') {
          continue;
        }

        const matchId = generateUUID();
        const match: BracketMatch = {
          id: matchId,
          created_at: now,
          tournament_id: tournamentId,
          round_number: roundNum,
          match_number: cycleMatches.length + 1, // Global match number in this generation batch? Or per round?
          // Usually match_number is per round or global. The other generators use per-round index + 1.
          // Let's stick to per-round index + 1 for consistency with other generators in this file.
          // Wait, other generators use `i + 1` inside the loop.
          // Here `i` is the match index within the round.
          stage: stage,
          participant_a_id: isSecondLeg ? away.id : home.id,
          participant_b_id: isSecondLeg ? home.id : away.id,
          score_a: 0,
          score_b: 0,
          winner_id: null,
          status: 'pending',
          next_match_id: null,
        };
        // Override match_number to be i + 1
        match.match_number = i + 1;

        cycleMatches.push(match);
      }

      // Rotate indices for next round
      // Keep index 0 fixed.
      // Move last element to position 1.
      // Shift everything else (1..last-1) to the right.
      // [0, 1, 2, 3] -> [0, 3, 1, 2]
      const fixed = roundIndices[0];
      const rotating = roundIndices.slice(1);
      const last = rotating.pop();
      if (last !== undefined) {
        rotating.unshift(last);
      }
      roundIndices = [fixed, ...rotating];
    }
    return cycleMatches;
  };

  matches.push(...generateCycle(false));

  if (options?.doubleRoundRobin) {
    matches.push(...generateCycle(true));
  }

  return matches;
};
