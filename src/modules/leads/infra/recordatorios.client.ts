// Los recordatorios de quien mira sobre un lead, leídos en el navegador (la sección de la ficha y la
// pestaña del drawer, 9d-2): por páginas y uno por su id. La RLS deja sólo los suyos y vivos.
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import { paginaDeRecordatoriosDesde } from '../entities/pagina-de-recordatorios'
import { recordatoriosDesde } from '../entities/recordatorios'
import type { LectorDePaginaDeRecordatorios, LectorDeRecordatorio } from '../entities/repositorios'

const COLUMNAS =
  'id, titulo, recordar_en, notificado_en, completado_en, actualizado_en, lead_id, lead_nombre, lead_numero, vehiculo_id, vehiculo_titulo, vehiculo_numero, vehiculo_oculto'

// Una página de los pendientes o de los completados (9d-2), con `lead_recordatorios()`: un cursor que
// la base usa como condición de índice (`recordatorios_lead_pendientes_idx` y `…_completados_idx`).
export const leerPaginaDeRecordatorios: LectorDePaginaDeRecordatorios = async ({
  leadId,
  completados,
  desde,
}) => {
  const { data, error } = await createClient().rpc('lead_recordatorios', {
    p_lead: leadId,
    p_completados: completados,
    p_tamano: TAMANO_DE_VER_MAS,
    ...(desde ? { p_desde_en: desde.desdeEn, p_desde_id: desde.desdeId } : {}),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDeRecordatoriosDesde(data)
  return pagina ? ok(pagina) : fallo('inesperado', 'No pudimos leer los recordatorios.')
}

// Uno por su id, de `recordatorios_vista` (la clave primaria; la RLS deja sólo los suyos y vivos).
export const leerRecordatorio: LectorDeRecordatorio = async (id) => {
  const { data, error } = await createClient()
    .from('recordatorios_vista')
    .select(COLUMNAS)
    .eq('id', id)
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(data ? (recordatoriosDesde([data])[0] ?? null) : null)
}
