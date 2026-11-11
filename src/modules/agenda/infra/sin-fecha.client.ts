// Las tareas sin fecha, leídas en el navegador al abrir la sección (7.07-3) con la sesión de quien mira: `agenda_tareas_sin_fecha` es de invocador, la RLS decide
// qué llega. Una página de `TAMANO_DE_VER_MAS`, por cursor `(creado_en, id)`: sostiene la consulta `tareas_sin_fecha_idx (responsable_id, creado_en desc, id desc)`.
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import { paginaDeSinFecha, type LectorDeSinFecha } from '../entities/sin-fecha'

export const leerTareasSinFecha: LectorDeSinFecha = async (cursor) => {
  const { data, error } = await createClient().rpc('agenda_tareas_sin_fecha', {
    p_tamano: TAMANO_DE_VER_MAS,
    // El cursor va completo o no va (a medias la base lo rechaza).
    ...(cursor ? { p_antes_en: cursor.antesEn, p_antes_id: cursor.antesId } : {}),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDeSinFecha(data)
  return pagina ? ok(pagina) : fallo('inesperado', 'No pudimos leer tus tareas sin fecha.')
}
