// Los recordatorios de quien mira sobre un lead, leídos en el navegador (la pestaña «Seguimientos» del
// drawer): la misma consulta que la ficha hace en el servidor. La RLS deja sólo los suyos y vivos.
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { recordatoriosDesde } from '../entities/recordatorios'
import type { LectorDeRecordatoriosDelLead } from '../entities/repositorios'

export const leerRecordatoriosDelLead: LectorDeRecordatoriosDelLead = async (leadId) => {
  const { data, error } = await createClient()
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
