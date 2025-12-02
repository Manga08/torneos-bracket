import { useMemo } from 'react';

import type { Match, Participant } from '@/types/database';

interface StandingsTableProps {
  participants: Participant[];
  matches: Match[];
}

interface Standing {
  participantId: string;
  participantName: string;
  played: number;
  won: number;
  lost: number;
  draw: number;
  points: number;
  buchholz: number; // For Swiss
  buchholzCut1: number; // For Swiss
  sonnebornBerger: number; // For Swiss
  gamePoints: number; // Score difference or total score
}

export const StandingsTable = ({ participants, matches }: StandingsTableProps) => {
  const standings = useMemo(() => {
    const stats: Record<string, Standing> = {};

    // Initialize stats
    participants.forEach((p) => {
      stats[p.id] = {
        participantId: p.id,
        participantName: p.name,
        played: 0,
        won: 0,
        lost: 0,
        draw: 0,
        points: 0,
        buchholz: 0,
        buchholzCut1: 0,
        sonnebornBerger: 0,
        gamePoints: 0,
      };
    });

    // Calculate basic stats
    matches.forEach((match) => {
      if (match.status !== 'completed' || !match.winner_id) return;
      if (!match.participant_a_id || !match.participant_b_id) return;

      const pA = stats[match.participant_a_id];
      const pB = stats[match.participant_b_id];

      if (!pA || !pB) return;

      pA.played++;
      pB.played++;

      // Add game points (scores)
      pA.gamePoints += match.score_a || 0;
      pB.gamePoints += match.score_b || 0;

      if (match.winner_id === match.participant_a_id) {
        pA.won++;
        pA.points += 1; // Or 3 for win depending on rules
        pB.lost++;
      } else if (match.winner_id === match.participant_b_id) {
        pB.won++;
        pB.points += 1;
        pA.lost++;
      } else {
        pA.draw++;
        pB.draw++;
        pA.points += 0.5;
        pB.points += 0.5;
      }
    });

    // Calculate Tiebreakers (Buchholz, etc.)
    // This requires a second pass after points are calculated
    Object.values(stats).forEach((player) => {
      let buchholz = 0;
      let sonnebornBerger = 0;
      const opponents: string[] = [];

      matches.forEach((match) => {
        if (match.status !== 'completed') return;
        if (match.participant_a_id === player.participantId && match.participant_b_id) {
          opponents.push(match.participant_b_id);
          if (match.winner_id === player.participantId) {
            sonnebornBerger += stats[match.participant_b_id]?.points || 0;
          } else if (!match.winner_id) {
            // Draw
            sonnebornBerger += (stats[match.participant_b_id]?.points || 0) / 2;
          }
        } else if (match.participant_b_id === player.participantId && match.participant_a_id) {
          opponents.push(match.participant_a_id);
          if (match.winner_id === player.participantId) {
            sonnebornBerger += stats[match.participant_a_id]?.points || 0;
          } else if (!match.winner_id) {
            // Draw
            sonnebornBerger += (stats[match.participant_a_id]?.points || 0) / 2;
          }
        }
      });

      opponents.forEach((oppId) => {
        buchholz += stats[oppId]?.points || 0;
      });

      player.buchholz = buchholz;
      player.sonnebornBerger = sonnebornBerger;

      // Buchholz Cut 1 (sum of opponents points excluding the lowest)
      if (opponents.length > 0) {
        const opponentPoints = opponents
          .map((oppId) => stats[oppId]?.points || 0)
          .sort((a, b) => a - b);
        player.buchholzCut1 = buchholz - opponentPoints[0];
      } else {
        player.buchholzCut1 = 0;
      }
    });

    return Object.values(stats).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
      if (b.buchholzCut1 !== a.buchholzCut1) return b.buchholzCut1 - a.buchholzCut1;
      if (b.sonnebornBerger !== a.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
      return b.gamePoints - a.gamePoints;
    });
  }, [participants, matches]);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-text-muted uppercase bg-surface border-b border-border">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Participante</th>
            <th className="px-4 py-3 text-center">PJ</th>
            <th className="px-4 py-3 text-center">G</th>
            <th className="px-4 py-3 text-center">P</th>
            <th className="px-4 py-3 text-center">E</th>
            <th className="px-4 py-3 text-center font-bold text-white">Pts</th>
            <th className="px-4 py-3 text-center text-text-muted" title="Buchholz">
              BH
            </th>
            <th className="px-4 py-3 text-center text-text-muted" title="Buchholz Cut 1">
              BH-1
            </th>
            <th className="px-4 py-3 text-center text-text-muted" title="Sonneborn-Berger">
              SB
            </th>
          </tr>
        </thead>
        <tbody>
          {standings.map((stat, index) => (
            <tr
              key={stat.participantId}
              className="bg-surface/50 border-b border-border hover:bg-white/5 transition-colors"
            >
              <td className="px-4 py-3 font-mono text-text-muted">{index + 1}</td>
              <td className="px-4 py-3 font-medium text-white">{stat.participantName}</td>
              <td className="px-4 py-3 text-center">{stat.played}</td>
              <td className="px-4 py-3 text-center text-success">{stat.won}</td>
              <td className="px-4 py-3 text-center text-danger">{stat.lost}</td>
              <td className="px-4 py-3 text-center text-text-muted">{stat.draw}</td>
              <td className="px-4 py-3 text-center font-bold text-primary text-base">
                {stat.points}
              </td>
              <td className="px-4 py-3 text-center text-text-muted">{stat.buchholz}</td>
              <td className="px-4 py-3 text-center text-text-muted">{stat.buchholzCut1}</td>
              <td className="px-4 py-3 text-center text-text-muted">{stat.sonnebornBerger}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
