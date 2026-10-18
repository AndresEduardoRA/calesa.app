import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  errorDePostgrest,
  fallo,
  MENSAJE_INESPERADO,
  ok,
  type Resultado,
} from '@/shared/lib/errores'
import type { Database, Json } from '@/shared/types/database.types'
import {
  candidatosDesde,
  type Candidatos,
  type FiltrosDeCandidatos,
} from '../../entities/candidatos'

// Los candidatos de una ventana (`leads_candidatos`, 5a-fix-1b): los primeros que coinciden, en el orden del listado, sólo de lo que quien mira
// ve. Índice: `leads_busqueda_idx` (la cartera y el nombre trigram, y los campos públicos). La base cuenta quién mira, su alcance y las bajas en
// curso; acá no se manda nada de eso. Una respuesta que no tiene la forma esperada es un error, no «ninguno».
export async function leerCandidatos(
  supabase: SupabaseClient<Database>,
  filtros: FiltrosDeCandidatos,
): Promise<Resultado<Candidatos>> {
  const { data, error } = await supabase.rpc('leads_candidatos', {
    p_filtros: filtros as unknown as Json,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const candidatos = candidatosDesde(data)
  if (candidatos === null) {
    return fallo('inesperado', MENSAJE_INESPERADO)
  }
  return ok(candidatos)
}
