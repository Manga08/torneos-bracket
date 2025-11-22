import { useMemo } from 'react';
import type { Match, Participant } from '../types/database';

interface StandingsTableProps {
  participants: Participant[];
  matches: Match[];
}

interface Standing {
  participantId: string;
  name: string;
  played: number;
  won: number;
  lost: number;
  draw: number;
  points: number;
  roundDiff: number;
}

export const StandingsTable = ({ participants, matches }: StandingsTableProps) => {
  const standings = useMemo(() => {
    const stats: Record<string, Standing> = {};

    // Initialize
    participants.forEach(p => {
      stats[p.id] = {
        participantId: p.id,
        name: p.name,
        played: 0,
        won: 0,
        lost: 0,
        draw: 0,
        points: 0,
        roundDiff: 0
      };
    });

    // Calculate
    matches.forEach(match => {
      if (match.status !== 'completed') return;
      if (!match.participant_a_id || !match.participant_b_id) return;

      const pA = stats[match.participant_a_id];
      const pB = stats[match.participant_b_id];

      if (!pA || !pB) return;

      pA.played++;
      pB.played++;

      pA.roundDiff += (match.score_a - match.score_b);
      pB.roundDiff += (match.score_b - match.score_a);

      if (match.score_a > match.score_b) {
        pA.won++;
        pA.points += 3;
        pB.lost++;
      } else if (match.score_b > match.score_a) {
        pB.won++;
        pB.points += 3;
        pA.lost++;
      } else {
        pA.draw++;
        pB.draw++;
        pA.points += 1;
        pB.points += 1;
      }
    });

    return Object.values(stats).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.roundDiff - a.roundDiff;
    });
  }, [participants, matches]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-text-muted">
        <thead className="text-xs text-white uppercase bg-white/5 border-b border-white/10">
          <tr>
            <th className="px-4 py-3 rounded-tl-lg">Equipo</th>
            <th className="px-4 py-3 text-center">PJ</th>
            <th className="px-4 py-3 text-center">G</th>
            <th className="px-4 py-3 text-center">E</th>
            <th className="px-4 py-3 text-center">P</th>
            <th className="px-4 py-3 text-center">Dif</th>
            <th className="px-4 py-3 text-center font-bold text-primary rounded-tr-lg">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team, index) => (
            <tr key={team.participantId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                <span className="text-xs text-text-muted w-4">{index + 1}.</span>
                {team.name}
              </td>
              <td className="px-4 py-3 text-center">{team.played}</td>
              <td className="px-4 py-3 text-center text-green-400">{team.won}</td>
              <td className="px-4 py-3 text-center">{team.draw}</td>
              <td className="px-4 py-3 text-center text-red-400">{team.lost}</td>
              <td className="px-4 py-3 text-center">{team.roundDiff > 0 ? `+${team.roundDiff}` : team.roundDiff}</td>
              <td className="px-4 py-3 text-center font-bold text-white bg-white/5">{team.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
