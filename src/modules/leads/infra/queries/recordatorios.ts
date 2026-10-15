import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { recordatoriosDesde } from '../../entities/recordatorios'
import type { LectorDeRecordatoriosDelLead } from '../../entities/repositorios'

// Los recordatorios de quien mira sobre un lead, de `recordatorios_vista` (la RLS deja sólo los
// suyos y vivos; el lead viene nulo si ya no lo ve, así que filtrar por él ya deja afuera lo que no
// se ve). Los completados también, para poder reabrirlos.
export const getRecordatoriosDelLead: LectorDeRecordatoriosDelLead = async (leadId) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recordatorios_vista')
    .select(
      'id, titulo, recordar_en, notificado_en, completado_en, actualizado_en, lead_id, lead_nombre, lead_numero',
    )
    .eq('lead_id', leadId)
    .order('recordar_en')
    .limit(100)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(recordatoriosDesde(data))
}
