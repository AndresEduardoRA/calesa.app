import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { detalleDeRecordatorioDesde, type LectorDeRecordatorio } from '../../entities/recordatorio'

// Un recordatorio por su id, bajo la RLS (`recordatorios: leer`: sólo los propios y vivos; `recordatorios_pkey`). La vista trae el nombre del lead sólo si quien mira
// lo ve. Lo que no existe, está eliminado o es ajeno vuelve nulo.
export const getRecordatorio: LectorDeRecordatorio = async (id) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recordatorios_vista')
    .select('id, titulo, recordar_en, completado_en, actualizado_en, lead_id, lead_nombre')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(data ? detalleDeRecordatorioDesde(data) : null)
}
