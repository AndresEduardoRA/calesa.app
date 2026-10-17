import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeIdsDelNumero } from '../../entities/numero'

// El mayor número propio que cabe en la columna (`integer`): uno más grande no existe, y preguntarlo es un error.
const MAYOR_NUMERO_PROPIO = 2_147_483_647

const filas = z.array(z.object({ lead_id: z.guid() }))

// «#124» → el id del lead con ese número, si quien mira lo ve. Se lee de la copia que corresponde, por su índice
// único, y la policy de esa tabla hace el resto: la fila del global existe sólo con `leads.numero_global.ver`, la del
// propio sólo para quien creó el lead (o con el permiso), y las dos sólo de un lead que se ve (nunca el limbo ni la
// papelera). Sin el permiso no se busca el global: sería un oráculo para saber el número de un lead visible.
export const getIdsDelNumero: LectorDeIdsDelNumero = async (numero, { global }) => {
  const supabase = await createClient()
  if (global) {
    // Índice `leads_numeros_globales_numero_key`.
    const { data, error } = await supabase
      .from('leads_numeros_globales')
      .select('lead_id')
      .eq('numero', numero)
      .limit(1)
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    return ok(filas.parse(data).map((fila) => fila.lead_id))
  }
  if (numero > MAYOR_NUMERO_PROPIO) {
    return ok([])
  }
  const { data: sesion } = await supabase.auth.getClaims()
  const yo = sesion?.claims.sub
  if (!yo) {
    return ok([])
  }
  // Índice `leads_numeros_propios_creador_idx` (creado_por, numero).
  const { data, error } = await supabase
    .from('leads_numeros_propios')
    .select('lead_id')
    .eq('creado_por', yo)
    .eq('numero', numero)
    .limit(1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(filas.parse(data).map((fila) => fila.lead_id))
}
