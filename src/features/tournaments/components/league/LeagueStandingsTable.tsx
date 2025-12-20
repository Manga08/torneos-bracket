import { Trophy, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { useState, useEffect } from 'react';

import { updateParticipantLeagueManualValue } from '@/features/tournaments/api/participants.api';
import type { LeagueColumnDefinition } from '@/features/tournaments/types/league';
import type { LeagueRow } from '@/features/tournaments/utils/leagueLogic';
import type { Participant } from '@/types/database';

interface LeagueStandingsTableProps {
  standings: LeagueRow[];
  participants?: Participant[];
  columns?: LeagueColumnDefinition[];
  isLoading?: boolean;
  canEdit?: boolean;
  onManualValueUpdate?: () => void;
}

const DEFAULT_COLUMNS: LeagueColumnDefinition[] = [
  {
    id: 'pos',
    label: 'Pos',
    kind: 'built_in',
    source: 'position',
    visible: true,
    width: 60,
    align: 'center',
  },
  { id: 'name', label: 'Equipo', kind: 'built_in', source: 'name', visible: true, align: 'left' },
  {
    id: 'pj',
    label: 'PJ',
    kind: 'built_in',
    source: 'played',
    visible: true,
    width: 60,
    align: 'center',
  },
  {
    id: 'w',
    label: 'V',
    kind: 'built_in',
    source: 'won',
    visible: true,
    width: 60,
    align: 'center',
  },
  {
    id: 'd',
    label: 'E',
    kind: 'built_in',
    source: 'draw',
    visible: true,
    width: 60,
    align: 'center',
  },
  {
    id: 'l',
    label: 'D',
    kind: 'built_in',
    source: 'lost',
    visible: true,
    width: 60,
    align: 'center',
  },
  {
    id: 'gf',
    label: 'GF',
    kind: 'built_in',
    source: 'for',
    visible: true,
    width: 60,
    align: 'center',
  },
  {
    id: 'gc',
    label: 'GC',
    kind: 'built_in',
    source: 'against',
    visible: true,
    width: 60,
    align: 'center',
  },
  {
    id: 'diff',
    label: 'DIF',
    kind: 'built_in',
    source: 'diff',
    visible: true,
    width: 60,
    align: 'center',
  },
  {
    id: 'pts',
    label: 'PTS',
    kind: 'built_in',
    source: 'points',
    visible: true,
    width: 60,
    align: 'center',
  },
];

const ManualCell = ({
  participantId,
  columnId,
  initialValue,
  canEdit,
  onUpdate,
}: {
  participantId: string;
  columnId: string;
  initialValue: string | number;
  canEdit?: boolean;
  onUpdate?: () => void;
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleBlur = async () => {
    if (value !== initialValue) {
      try {
        await updateParticipantLeagueManualValue(participantId, columnId, value);
        onUpdate?.();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error updating manual value:', error);
        setValue(initialValue); // Revert on error
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  if (canEdit) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent border border-transparent hover:border-white/10 focus:border-primary rounded px-1 py-0.5 text-center outline-none transition-colors"
      />
    );
  }

  return <span>{value}</span>;
};

export const LeagueStandingsTable = ({
  standings,
  participants,
  columns = DEFAULT_COLUMNS,
  isLoading,
  canEdit,
  onManualValueUpdate,
}: LeagueStandingsTableProps) => {
  if (isLoading) {
    return <div className="p-8 text-center text-text-muted">Cargando clasificación...</div>;
  }

  if (standings.length === 0) {
    return (
      <div className="p-8 text-center text-text-muted">
        No hay datos de clasificación disponibles.
      </div>
    );
  }

  const visibleColumns = columns.filter((c) => c.visible !== false);

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-white/10 bg-surface shadow-xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="standings-header text-xs uppercase tracking-wider text-text-muted">
            {visibleColumns.map((col, index) => (
              <th
                key={col.id}
                className={`p-4 font-medium ${index === 0 ? 'standings-th-first' : ''} ${
                  index === visibleColumns.length - 1 ? 'standings-th-last' : ''
                } text-${col.align || 'left'}`}
                style={{ width: col.width }}
                title={col.label}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-sm">
          {standings.map((row, index) => {
            const isTop3 = index < 3;
            const rank = index + 1;
            const participant = participants?.find((p) => p.id === row.participantId);

            return (
              <tr key={row.participantId} className="standings-row transition-colors">
                {visibleColumns.map((col) => {
                  let content: React.ReactNode = null;

                  if (col.kind === 'built_in') {
                    switch (col.source) {
                      case 'position':
                        content = (
                          <div className="flex items-center justify-center gap-2">
                            {rank === 1 && <Trophy size={16} className="text-yellow-400" />}
                            {rank === 2 && <Trophy size={16} className="text-gray-300" />}
                            {rank === 3 && <Trophy size={16} className="text-amber-600" />}
                            <span
                              className={`${isTop3 ? 'font-bold text-white' : 'text-text-muted'} ${
                                rank > 3 ? 'ml-6' : ''
                              }`}
                            >
                              {rank}
                            </span>
                          </div>
                        );
                        break;
                      case 'name':
                        content = (
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-white text-base">{row.name}</div>
                          </div>
                        );
                        break;
                      case 'diff':
                        content = (
                          <div className="flex items-center justify-center gap-1">
                            {row.diff > 0 ? (
                              <span className="text-success flex items-center">
                                <TrendingUp size={12} className="mr-1" />+{row.diff}
                              </span>
                            ) : row.diff < 0 ? (
                              <span className="text-danger flex items-center">
                                <TrendingDown size={12} className="mr-1" />
                                {row.diff}
                              </span>
                            ) : (
                              <span className="text-text-muted flex items-center">
                                <Minus size={12} className="mr-1" />0
                              </span>
                            )}
                          </div>
                        );
                        break;
                      default:
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        content = (row as any)[col.source as string];
                        if (col.source === 'points') {
                          content = (
                            <span className="font-bold text-lg text-primary">{content}</span>
                          );
                        } else {
                          content = <span className="text-white/80">{content}</span>;
                        }
                    }
                  } else if (col.kind === 'metric') {
                    const source = col.source as { metricId: string; agg: string };
                    const key = `metric_${source.metricId}_${source.agg}`;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const val = (row as any)[key] ?? '-';
                    content = <span className="text-white/80">{val}</span>;
                  } else {
                    // Manual column
                    const metadata = (participant?.metadata as Record<string, unknown>) || {};
                    const leagueManual =
                      (metadata.leagueManual as Record<string, string | number>) || {};
                    const val = leagueManual[col.id] ?? '';

                    content = (
                      <ManualCell
                        participantId={row.participantId}
                        columnId={col.id}
                        initialValue={val}
                        canEdit={canEdit && col.editable}
                        onUpdate={onManualValueUpdate}
                      />
                    );
                  }

                  return (
                    <td key={col.id} className={`p-4 text-${col.align || 'left'}`}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
