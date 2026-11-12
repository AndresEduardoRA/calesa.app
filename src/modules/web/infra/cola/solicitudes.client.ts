// «Ver más» de «Sin asignar» (8.04-2), leído en el navegador con la sesión de quien mira: `cola_web_solicitudes` es de definidor y vuelve a exigir
// `web.cola.gestionar`, así que la base decide igual. De a `TAMANO_DE_VER_MAS`, por cursor `(creado_en, id)`: sostiene la consulta
// `solicitudes_contacto_web_estado_creado_idx (estado, creado_en desc, id desc)`.
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import type { LectorDeSinAsignar } from '../../entities/cola/repositorios'
import { paginaDeSolicitudes } from '../../entities/cola/solicitudes'

export const leerMasSinAsignar: LectorDeSinAsignar = async (cursor) => {
  const { data, error } = await createClient().rpc('cola_web_solicitudes', {
    p_estado: 'sin_asignar',
    p_tamano: TAMANO_DE_VER_MAS,
    // El cursor va completo o no va (a medias la base lo rechaza).
    ...(cursor ? { p_cursor_creado: cursor.creadoEn, p_cursor_id: cursor.id } : {}),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDeSolicitudes(data)
  return pagina ? ok(pagina) : fallo('inesperado', 'No pudimos leer más solicitudes sin asignar.')
}
