import { motion } from 'framer-motion';
import { Trophy, Medal } from 'lucide-react';

import type { LeagueSnapshotMember } from '@/features/tournaments/types/league';

interface LeaguePodiumProps {
  winners: LeagueSnapshotMember[];
}

export function LeaguePodium({ winners }: LeaguePodiumProps) {
  if (!winners || winners.length === 0) return null;

  const first = winners[0];
  const second = winners[1];
  const third = winners[2];

  return (
    <div className="flex flex-col items-center justify-center py-8 bg-gradient-to-b from-background/50 to-background rounded-lg border border-border/50 mb-8">
      <h2 className="text-2xl font-bold mb-8 text-primary flex items-center gap-2">
        <Trophy className="w-6 h-6" />
        Resultados Finales
      </h2>

      <div className="flex items-end justify-center gap-4 md:gap-8">
        {/* 2nd Place */}
        {second && (
          <PodiumStep
            member={second}
            place={2}
            height="h-32"
            color="bg-slate-400/20 border-slate-400"
            icon={<Medal className="w-8 h-8 text-slate-400" />}
            delay={0.2}
          />
        )}

        {/* 1st Place */}
        {first && (
          <PodiumStep
            member={first}
            place={1}
            height="h-40"
            color="bg-yellow-500/20 border-yellow-500"
            icon={<Trophy className="w-10 h-10 text-yellow-500" />}
            delay={0.4}
          />
        )}

        {/* 3rd Place */}
        {third && (
          <PodiumStep
            member={third}
            place={3}
            height="h-24"
            color="bg-amber-700/20 border-amber-700"
            icon={<Medal className="w-6 h-6 text-amber-700" />}
            delay={0.6}
          />
        )}
      </div>
    </div>
  );
}

interface PodiumStepProps {
  member: LeagueSnapshotMember;
  place: number;
  height: string;
  color: string;
  icon: React.ReactNode;
  delay: number;
}

function PodiumStep({ member, place, height, color, icon, delay }: PodiumStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="flex flex-col items-center"
    >
      <div className="mb-2 text-center">
        <div className="font-bold text-lg truncate max-w-[120px] md:max-w-40">{member.name}</div>
        <div className="text-sm text-muted-foreground">{member.points} pts</div>
      </div>

      <div
        className={`w-24 md:w-32 ${height} ${color} border-t-4 rounded-t-lg flex flex-col items-center justify-start pt-4 relative`}
      >
        <div className="mb-2">{icon}</div>
        <div className="text-2xl font-bold opacity-50">#{place}</div>
      </div>
    </motion.div>
  );
}
