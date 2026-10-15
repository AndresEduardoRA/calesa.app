// «Ver más» de la línea de tiempo, en el navegador: la página siguiente con la sesión de quien
// mira. La RLS decide qué llega; acá no se decide nada.
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import type { LectorDeSeguimientos } from '../entities/repositorios'
import {
  paginaDeSeguimientosDesde,
  TAMANO_DE_PAGINA_DE_SEGUIMIENTOS,
} from '../entities/seguimiento'

export const leerMasSeguimientos: LectorDeSeguimientos = async ({ leadId, antes }) => {
  const { data, error } = await createClient().rpc('lead_seguimientos', {
    p_lead: leadId,
    p_tamano: TAMANO_DE_PAGINA_DE_SEGUIMIENTOS,
    ...(antes ? { p_antes_en: antes.antesEn, p_antes_id: antes.antesId } : {}),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDeSeguimientosDesde(data)
  return pagina ? ok(pagina) : fallo('inesperado', 'No pudimos leer los seguimientos.')
}
