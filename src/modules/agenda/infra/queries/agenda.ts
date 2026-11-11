import 'server-only'
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { leerAgendaDeRango, type LectorDeAgenda } from '../../entities/agenda'

// Eventos, tareas, recordatorios y subastas de un rango en **una** llamada (`agenda_rango`, de invocador: la RLS de cada tabla decide qué se ve).
// Cada clase trae como mucho `tope` filas y dice si hubo más; el rango, ≤ 45 días. Los índices los nombra la RPC (`eventos_inicio_idx`,
// `tareas_responsable_idx`, `tareas_vence_idx`, `recordatorios_usuario_idx`, `vehiculos_cierre_subasta_idx`). `p_de_todos` lo vuelve a exigir la base.
export const getAgenda: LectorDeAgenda = async ({ desde, hasta, deTodos }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('agenda_rango', {
    p_desde: desde,
    p_hasta: hasta,
    p_de_todos: deTodos,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return leerAgendaDeRango(data)
}
