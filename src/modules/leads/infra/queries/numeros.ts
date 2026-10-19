import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeIdsDelNumero } from '../../entities/numero'

const ids = z.array(z.guid())

// «#124» → los ids de los leads con ese número que quien mira ve, en una sola llamada a `leads_ids_del_numero` (como mucho 100). La base
// decide qué números cuentan: con `leads.numero_global.ver` el global y el propio de cualquier creador (`todos`), sin él el propio de quien llama,
// aunque se pida `todos` (la policy de las dos copias es la regla). Un número fuera de lo que cabe en la columna no es un error: no encuentra nada.
// Índices: `leads_numeros_globales_numero_key` y, por cada persona del equipo, `leads_numeros_propios_creador_idx` (2,4 ms con 212.000 leads).
export const getIdsDelNumero: LectorDeIdsDelNumero = async (numero, { todos }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('leads_ids_del_numero', {
    p_numero: numero,
    p_todos: todos,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(ids.parse(data))
}
