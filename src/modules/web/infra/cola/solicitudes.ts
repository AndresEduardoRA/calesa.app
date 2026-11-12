import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeSinAsignar } from '../../entities/cola/repositorios'
import { paginaDeSolicitudes } from '../../entities/cola/solicitudes'

// La primera página de «Sin asignar» (8.04-2), leída en el servidor para que la pantalla llegue dibujada y con su conteo; «Ver más» sigue en el navegador
// (`solicitudes.client.ts`). Sostiene la consulta `solicitudes_contacto_web_estado_creado_idx (estado, creado_en desc, id desc)`.
export const leerSinAsignar: LectorDeSinAsignar = async (cursor) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('cola_web_solicitudes', {
    p_estado: 'sin_asignar',
    p_tamano: TAMANO_DE_VER_MAS,
    // El cursor va completo o no va (a medias la base lo rechaza).
    ...(cursor ? { p_cursor_creado: cursor.creadoEn, p_cursor_id: cursor.id } : {}),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDeSolicitudes(data)
  return pagina ? ok(pagina) : fallo('inesperado', 'No pudimos leer las solicitudes sin asignar.')
}
