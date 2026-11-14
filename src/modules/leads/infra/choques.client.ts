// «Ver más» y «Seguir buscando» de los choques de teléfonos extra, en el navegador con la sesión de quien configura: la misma RPC que lee
// el servidor para la primera página (`infra/queries/choques-de-telefonos.ts`), de a `TAMANO_DE_VER_MAS`.
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import { choquesDesde, type LectorDeChoques } from '../entities/ajustes-de-leads'

export const leerChoques: LectorDeChoques = async (cursor) => {
  const { data, error } = await createClient().rpc('telefonos_extra_choques', {
    p_tamano: TAMANO_DE_VER_MAS,
    ...(cursor === null ? {} : { p_despues: cursor }),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = choquesDesde(data)
  return pagina ? ok(pagina) : fallo('inesperado', 'No pudimos leer los teléfonos repetidos.')
}
