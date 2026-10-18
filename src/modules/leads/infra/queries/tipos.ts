import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeTiposDeLeadConUso } from '../../entities/repositorios-de-tipos'
import { listaDeTiposDesde } from '../../entities/tipo-de-lead'

// Para la pantalla de configuración: los tipos con su clase y si algún lead usa cada uno (la RPC cuenta también los de la
// papelera, que la RLS esconde), y el tope. Son a lo sumo 100 filas, con una sonda sobre `leads_tipo_lead_id_idx` cada una:
// nunca un conteo. Quien nombra el tipo de un lead (el listado, la ficha, el alta, la exportación) lee `leads_catalogos()`.
export const getTiposDeLeadConUso: LectorDeTiposDeLeadConUso = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('tipos_lead_con_uso')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const lista = listaDeTiposDesde(data)
  return lista
    ? ok(lista)
    : fallo('inesperado', 'No pudimos leer los tipos. Recarga para ver cómo quedaron.')
}
