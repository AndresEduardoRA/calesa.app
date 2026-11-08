// Los comentarios de una cotización desde el navegador, con la sesión de quien mira (4.27-2): `cotizacion_comentarios` y `cotizacion_comentario_respuestas`
// piden ver la cotización. De a `TAMANO_DE_VER_MAS` raíces, cada una con sus primeras `TAMANO_DE_VER_MAS` respuestas, por cursor `(creado_en, id)`:
// `cotizaciones_comentarios_raices_idx` y `cotizaciones_comentarios_respuestas_idx` (4.27-1). El cursor viaja con la fecha tal cual la dio la base.
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import {
  paginaDeComentariosDesde,
  paginaDeRespuestasDesde,
  type PaginaDeComentarios,
  type PaginaDeRespuestas,
} from '../../entities/comentarios/comentario'
import type { CursorDeRaices, CursorDeRespuestas } from '../../entities/comentarios/lista'

export const NO_SE_CARGARON = 'No se pudieron cargar los comentarios.'

export async function leerComentarios(pedido: {
  cotizacionId: string
  cursor: CursorDeRaices | null
}): Promise<Resultado<PaginaDeComentarios>> {
  const { cotizacionId, cursor } = pedido
  const { data, error } = await createClient().rpc('cotizacion_comentarios', {
    p_cotizacion: cotizacionId,
    p_tope: TAMANO_DE_VER_MAS,
    p_primeros: TAMANO_DE_VER_MAS,
    ...(cursor ? { p_antes_en: cursor.antesEn, p_antes_id: cursor.antesId } : {}),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDeComentariosDesde(data)
  return pagina ? ok(pagina) : fallo('inesperado', NO_SE_CARGARON)
}

export async function leerRespuestas(pedido: {
  comentarioId: string
  cursor: CursorDeRespuestas | null
}): Promise<Resultado<PaginaDeRespuestas>> {
  const { comentarioId, cursor } = pedido
  const { data, error } = await createClient().rpc('cotizacion_comentario_respuestas', {
    p_comentario: comentarioId,
    p_tope: TAMANO_DE_VER_MAS,
    ...(cursor ? { p_despues_en: cursor.despuesEn, p_despues_id: cursor.despuesId } : {}),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDeRespuestasDesde(data)
  return pagina ? ok(pagina) : fallo('inesperado', 'No se pudieron cargar las respuestas.')
}
