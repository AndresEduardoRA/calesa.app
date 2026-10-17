import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { listaDeOrigenesDesde } from '../../entities/origen-de-lead'
import type { LectorDeOrigenesDeLead } from '../../entities/repositorios'
import type { LectorDeOrigenesDeLeadConUso } from '../../entities/repositorios-de-origenes'

// Todos los orígenes de lead, también los desactivados: nombran la columna «Origen» de un lead que
// entró por uno apagado y son las opciones del filtro. Los nombres salen de la fila.
export const getOrigenesDeLead: LectorDeOrigenesDeLead = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('origenes_lead')
    .select('id, clave, nombre, activo')
    .order('orden')
    .order('nombre')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(data)
}

// Para la pantalla de configuración: con si algún lead usa cada origen (la RPC cuenta también los de
// la papelera, que la RLS esconde). Son a lo sumo 100 filas, con un `exists` cada una sobre
// `leads_origen_lead_id_idx`: nunca un conteo.
export const getOrigenesDeLeadConUso: LectorDeOrigenesDeLeadConUso = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('origenes_lead_con_uso')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const lista = listaDeOrigenesDesde(data)
  return lista
    ? ok(lista)
    : fallo('inesperado', 'No pudimos leer los orígenes. Recarga para ver cómo quedaron.')
}
