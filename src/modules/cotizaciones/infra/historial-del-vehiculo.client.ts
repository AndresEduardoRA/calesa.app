// El historial de cotizaciones de un vehículo desde el navegador, con la sesión de quien mira: la RLS de `cotizaciones` decide cuáles llegan (un «propios» ve las suyas
// y las de su cartera). Va por el navegador porque el historial se lee al desplegarlo y cada «Ver más» pide su página sin ir al servidor.
// Una página de `TAMANO_DE_VER_MAS` y una fila de más para saber si hay otra. La sostiene `cotizaciones_vehiculo_creado_idx (vehiculo_id, creado_en desc, id desc)`;
// el borde del cursor sobre `creado_en` va como condición propia para que entre al índice (`aplicarCursor()`).
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import {
  armarPaginaPor,
  POR_ALTA,
  TAMANO_DE_VER_MAS,
  type Cursor,
  type Pagina,
} from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import { aplicarCursor, ordenarPorCursor } from '@/shared/lib/supabase/consultas'
import {
  COLUMNAS_DEL_HISTORIAL,
  historialDesde,
  type CotizacionDelHistorial,
} from '../entities/historial-del-vehiculo'

export type PedidoDelHistorial = { vehiculoId: string; cursor: Cursor | null }

export async function leerHistorialDelVehiculo({
  vehiculoId,
  cursor,
}: PedidoDelHistorial): Promise<Resultado<Pagina<CotizacionDelHistorial>>> {
  const base = createClient()
    .from('cotizaciones')
    .select(COLUMNAS_DEL_HISTORIAL)
    .eq('vehiculo_id', vehiculoId)
  const { data, error } = await ordenarPorCursor(
    aplicarCursor(base, cursor, POR_ALTA),
    cursor,
    POR_ALTA,
  ).limit(TAMANO_DE_VER_MAS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const cotizaciones = historialDesde(data)
  if (cotizaciones === null) {
    return fallo('inesperado', 'No se pudo cargar el historial.')
  }
  return ok(
    armarPaginaPor(cotizaciones, TAMANO_DE_VER_MAS, cursor, (cotizacion) => cotizacion.creadoEn),
  )
}
