// Lo que la línea de tiempo lee en el navegador, con la sesión de quien mira: «Ver más» (la página
// siguiente), la primera página y los tipos del drawer. La RLS decide qué llega; acá no se decide nada.
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import type {
  LectorDeSeguimiento,
  LectorDeSeguimientos,
  LectorDeTiposDeSeguimiento,
} from '../entities/repositorios'
import {
  paginaDeSeguimientosDesde,
  seguimientoDesde,
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

// Uno por su id, con `lead_seguimiento()` (la clave primaria): «Recargar» tras un conflicto con uno que
// no está en la primera página. Lo que no se ve llega `null`.
export const leerSeguimiento: LectorDeSeguimiento = async ({ leadId, id }) => {
  const { data, error } = await createClient().rpc('lead_seguimiento', { p_lead: leadId, p_id: id })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  if (data === null) {
    return ok(null)
  }
  const uno = seguimientoDesde(data)
  return uno ? ok(uno) : fallo('inesperado', 'No pudimos leer el seguimiento.')
}

// Los tipos activos, en su orden (la pestaña «Seguimientos» del drawer y anotar desde la tabla): la
// misma consulta que lee la ficha en el servidor.
export const leerTiposDeSeguimiento: LectorDeTiposDeSeguimiento = async () => {
  const { data, error } = await createClient()
    .from('tipos_seguimiento')
    .select('id, clave, nombre, icono')
    .eq('activo', true)
    .order('orden')
    .order('nombre')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(data.map((t) => ({ ...t })))
}
