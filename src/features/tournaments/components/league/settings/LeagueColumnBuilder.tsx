import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Settings2,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { updateLeagueColumns } from '@/features/tournaments/api/league.api';
import type {
  LeagueColumnDefinition,
  LeagueBuiltInSource,
  LeagueMetricsSchema,
  LeagueMetricColumnSource,
} from '@/features/tournaments/types/league';
import { AppButton } from '@/shared/components/ui/AppButton';

interface LeagueColumnBuilderProps {
  tournamentId: string;
  columns: LeagueColumnDefinition[];
  metricsSchema?: LeagueMetricsSchema;
  onUpdate: () => void;
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

const BUILT_IN_SOURCES: { value: LeagueBuiltInSource; label: string }[] = [
  { value: 'position', label: 'Posición' },
  { value: 'name', label: 'Nombre Equipo' },
  { value: 'played', label: 'Partidos Jugados' },
  { value: 'won', label: 'Victorias' },
  { value: 'draw', label: 'Empates' },
  { value: 'lost', label: 'Derrotas' },
  { value: 'points', label: 'Puntos' },
  { value: 'for', label: 'Goles a Favor' },
  { value: 'against', label: 'Goles en Contra' },
  { value: 'diff', label: 'Diferencia de Goles' },
  { value: 'rec', label: 'Récord (W-D-L)' },
];

function SortableItem({
  column,
  onToggleVisibility,
  onDelete,
  onUpdateAlign,
}: {
  column: LeagueColumnDefinition;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateAlign: (id: string, align: 'left' | 'center' | 'right') => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  let typeLabel = 'Manual';
  let typeColor = 'bg-amber-500/10 text-amber-400';

  if (column.kind === 'built_in') {
    typeLabel = 'Auto';
    typeColor = 'bg-blue-500/10 text-blue-400';
  } else if (column.kind === 'metric') {
    typeLabel = 'Métrica';
    typeColor = 'bg-purple-500/10 text-purple-400';
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-surface-dark p-3 rounded-lg border border-white/5 group"
    >
      <div {...attributes} {...listeners} className="cursor-grab text-text-muted hover:text-white">
        <GripVertical size={16} />
      </div>

      <div className="flex-1 flex items-center gap-3">
        <span className="font-medium text-white">{column.label}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${typeColor}`}>
          {typeLabel}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {/* Alignment */}
        <div className="flex bg-black/20 rounded p-0.5 mr-2">
          <button
            onClick={() => onUpdateAlign(column.id, 'left')}
            className={`p-1 rounded ${column.align === 'left' ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white'}`}
            title="Alinear Izquierda"
          >
            <AlignLeft size={14} />
          </button>
          <button
            onClick={() => onUpdateAlign(column.id, 'center')}
            className={`p-1 rounded ${column.align === 'center' || !column.align ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white'}`}
            title="Alinear Centro"
          >
            <AlignCenter size={14} />
          </button>
          <button
            onClick={() => onUpdateAlign(column.id, 'right')}
            className={`p-1 rounded ${column.align === 'right' ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white'}`}
            title="Alinear Derecha"
          >
            <AlignRight size={14} />
          </button>
        </div>

        <button
          onClick={() => onToggleVisibility(column.id)}
          className={`p-1.5 rounded hover:bg-white/10 ${
            column.visible !== false ? 'text-text-muted hover:text-white' : 'text-white/20'
          }`}
          title={column.visible !== false ? 'Ocultar' : 'Mostrar'}
        >
          {column.visible !== false ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>

        <button
          onClick={() => onDelete(column.id)}
          className="p-1.5 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400"
          title="Eliminar"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export const LeagueColumnBuilder = ({
  tournamentId,
  columns: initialColumns,
  metricsSchema,
  onUpdate,
}: LeagueColumnBuilderProps) => {
  const [columns, setColumns] = useState<LeagueColumnDefinition[]>(
    initialColumns && initialColumns.length > 0 ? initialColumns : DEFAULT_COLUMNS,
  );
  const [isAdding, setIsAdding] = useState(false);
  const [newCol, setNewCol] = useState<{
    label: string;
    kind: 'built_in' | 'manual' | 'metric';
    source: string; // For built_in and manual
    metricSource?: Partial<LeagueMetricColumnSource>; // For metric
  }>({
    label: '',
    kind: 'manual',
    source: '',
    metricSource: {},
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    try {
      await updateLeagueColumns(tournamentId, columns);
      toast.success('Columnas actualizadas');
      onUpdate();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      toast.error('Error al guardar columnas');
    }
  };

  const handleAddColumn = () => {
    if (!newCol.label) return;

    let id = '';
    let source: LeagueColumnDefinition['source'] = '';

    if (newCol.kind === 'built_in') {
      id = `bi_${newCol.source}_${Date.now()}`;
      source = newCol.source as LeagueBuiltInSource;
    } else if (newCol.kind === 'manual') {
      id = `man_${newCol.label.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
      source = `leagueManual.${id}`;
    } else if (newCol.kind === 'metric') {
      if (!newCol.metricSource?.metricId || !newCol.metricSource?.agg) return;
      id = `met_${newCol.metricSource.metricId}_${newCol.metricSource.agg}_${Date.now()}`;
      source = newCol.metricSource as LeagueMetricColumnSource;
    }

    const newColumn: LeagueColumnDefinition = {
      id,
      label: newCol.label,
      kind: newCol.kind,
      source,
      visible: true,
      align: 'center',
      editable: newCol.kind === 'manual',
    };

    setColumns([...columns, newColumn]);
    setIsAdding(false);
    setNewCol({ label: '', kind: 'manual', source: '', metricSource: {} });
  };

  const handleToggleVisibility = (id: string) => {
    setColumns(
      columns.map((c) => (c.id === id ? { ...c, visible: c.visible === false ? true : false } : c)),
    );
  };

  const handleDelete = (id: string) => {
    setColumns(columns.filter((c) => c.id !== id));
  };

  const handleUpdateAlign = (id: string, align: 'left' | 'center' | 'right') => {
    setColumns(columns.map((c) => (c.id === id ? { ...c, align } : c)));
  };

  return (
    <div className="space-y-4 bg-surface rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 size={20} className="text-primary" />
          <h3 className="font-bold text-white">Personalizar Tabla</h3>
        </div>
        <AppButton size="sm" onClick={handleSave}>
          Guardar Cambios
        </AppButton>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {columns.map((col) => (
              <SortableItem
                key={col.id}
                column={col}
                onToggleVisibility={handleToggleVisibility}
                onDelete={handleDelete}
                onUpdateAlign={handleUpdateAlign}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isAdding ? (
        <div className="bg-surface-dark p-4 rounded-lg border border-white/10 space-y-3 animate-in fade-in slide-in-from-top-2">
          <h4 className="text-sm font-medium text-white">Nueva Columna</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted block mb-1">Etiqueta (Header)</label>
              <input
                type="text"
                value={newCol.label}
                onChange={(e) => setNewCol({ ...newCol, label: e.target.value })}
                className="w-full bg-background border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                placeholder="Ej: Puntos Extra"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">Tipo</label>
              <select
                value={newCol.kind}
                onChange={(e) =>
                  setNewCol({
                    ...newCol,
                    kind: e.target.value as 'built_in' | 'manual' | 'metric',
                    source: '',
                    metricSource: {},
                  })
                }
                className="w-full bg-background border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
              >
                <option value="manual">Manual (Editable)</option>
                <option value="built_in">Automática (Estadística)</option>
                <option value="metric">Métrica Personalizada</option>
              </select>
            </div>

            {newCol.kind === 'built_in' && (
              <div className="md:col-span-2">
                <label className="text-xs text-text-muted block mb-1">Fuente de Datos</label>
                <select
                  value={newCol.source}
                  onChange={(e) => setNewCol({ ...newCol, source: e.target.value })}
                  className="w-full bg-background border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                >
                  <option value="">Seleccionar estadística...</option>
                  {BUILT_IN_SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {newCol.kind === 'metric' && (
              <>
                <div className="md:col-span-2">
                  <label className="text-xs text-text-muted block mb-1">Métrica</label>
                  <select
                    value={newCol.metricSource?.metricId || ''}
                    onChange={(e) =>
                      setNewCol({
                        ...newCol,
                        metricSource: { ...newCol.metricSource, metricId: e.target.value },
                      })
                    }
                    className="w-full bg-background border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                  >
                    <option value="">Seleccionar métrica...</option>
                    {metricsSchema?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">Operación</label>
                  <select
                    value={newCol.metricSource?.agg || ''}
                    onChange={(e) =>
                      setNewCol({
                        ...newCol,
                        metricSource: {
                          ...newCol.metricSource,
                          agg: e.target.value as 'sum' | 'avg' | 'diff',
                        },
                      })
                    }
                    className="w-full bg-background border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="sum">Suma Total</option>
                    <option value="avg">Promedio por Partido</option>
                    <option value="diff">Diferencia (A favor - En contra)</option>
                  </select>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <AppButton variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
              Cancelar
            </AppButton>
            <AppButton
              variant="primary"
              size="sm"
              onClick={handleAddColumn}
              disabled={
                !newCol.label ||
                (newCol.kind === 'built_in' && !newCol.source) ||
                (newCol.kind === 'metric' &&
                  (!newCol.metricSource?.metricId || !newCol.metricSource?.agg))
              }
            >
              Añadir
            </AppButton>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-2 border border-dashed border-white/10 rounded-lg text-text-muted hover:text-white hover:border-white/20 hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={16} />
          Añadir Columna
        </button>
      )}
    </div>
  );
};
