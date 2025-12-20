import { Plus, Trash2, Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { updateLeagueMetricsSchema } from '@/features/tournaments/api/league.api';
import type { LeagueMetricsSchema, LeagueMetricField } from '@/features/tournaments/types/league';
import { AppButton } from '@/shared/components/ui/AppButton';

interface LeagueMetricsSchemaBuilderProps {
  tournamentId: string;
  schema: LeagueMetricsSchema;
  onUpdate: () => void;
}

export const LeagueMetricsSchemaBuilder = ({
  tournamentId,
  schema: initialSchema,
  onUpdate,
}: LeagueMetricsSchemaBuilderProps) => {
  const [schema, setSchema] = useState<LeagueMetricsSchema>(initialSchema || []);
  const [newMetric, setNewMetric] = useState<LeagueMetricField>({
    id: '',
    label: '',
    type: 'pair',
    aLabel: 'W',
    bLabel: 'L',
  });

  const handleAddMetric = () => {
    if (!newMetric.id || !newMetric.label) {
      toast.error('ID y Etiqueta son requeridos');
      return;
    }

    if (schema.some((m) => m.id === newMetric.id)) {
      toast.error('El ID de la métrica ya existe');
      return;
    }

    setSchema([...schema, newMetric]);
    setNewMetric({
      id: '',
      label: '',
      type: 'pair',
      aLabel: 'W',
      bLabel: 'L',
    });
  };

  const handleRemoveMetric = (id: string) => {
    setSchema(schema.filter((m) => m.id !== id));
  };

  const handleSave = async () => {
    try {
      await updateLeagueMetricsSchema(tournamentId, schema);
      toast.success('Métricas actualizadas');
      onUpdate();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      toast.error('Error al guardar métricas');
    }
  };

  return (
    <div className="space-y-4 bg-surface rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white">Configurar Métricas por Partido</h3>
        <AppButton size="sm" onClick={handleSave}>
          <Save size={16} className="mr-2" />
          Guardar
        </AppButton>
      </div>

      <div className="space-y-2">
        {schema.map((metric) => (
          <div
            key={metric.id}
            className="flex items-center justify-between bg-surface-dark p-3 rounded-lg border border-white/5"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-text-muted bg-black/20 px-2 py-1 rounded">
                {metric.id}
              </span>
              <span className="font-medium text-white">{metric.label}</span>
              <span className="text-xs text-text-muted">
                ({metric.aLabel}/{metric.bLabel})
              </span>
            </div>
            <button
              onClick={() => handleRemoveMetric(metric.id)}
              className="p-1.5 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        {schema.length === 0 && (
          <div className="text-center py-4 text-text-muted text-sm">
            No hay métricas definidas. Añade una para empezar a trackear estadísticas extra (ej:
            Mapas, Rondas).
          </div>
        )}
      </div>

      <div className="bg-surface-dark p-4 rounded-lg border border-white/10 space-y-3">
        <h4 className="text-sm font-medium text-white">Nueva Métrica</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-text-muted block mb-1">ID (único)</label>
            <input
              type="text"
              value={newMetric.id}
              onChange={(e) =>
                setNewMetric({
                  ...newMetric,
                  id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                })
              }
              className="w-full bg-background border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
              placeholder="ej: maps"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1">Etiqueta</label>
            <input
              type="text"
              value={newMetric.label}
              onChange={(e) => setNewMetric({ ...newMetric, label: e.target.value })}
              className="w-full bg-background border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
              placeholder="ej: Mapas"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-text-muted block mb-1">Label A</label>
              <input
                type="text"
                value={newMetric.aLabel}
                onChange={(e) => setNewMetric({ ...newMetric, aLabel: e.target.value })}
                className="w-full bg-background border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                placeholder="W"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-text-muted block mb-1">Label B</label>
              <input
                type="text"
                value={newMetric.bLabel}
                onChange={(e) => setNewMetric({ ...newMetric, bLabel: e.target.value })}
                className="w-full bg-background border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                placeholder="L"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <AppButton
            variant="secondary"
            size="sm"
            onClick={handleAddMetric}
            disabled={!newMetric.id || !newMetric.label}
          >
            <Plus size={16} className="mr-1" />
            Añadir
          </AppButton>
        </div>
      </div>
    </div>
  );
};
