import 'server-only'
import { z } from 'zod'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  COLUMNAS_DE_COTIZACION,
  TOPE_DE_COTIZACIONES,
  filasDeCotizacionDesde,
  type FilaDeCotizacion,
} from '../../entities/cotizador/cotizacion'
import { TOPE_DE_LINEAS } from '../../entities/cotizador/formula'
import {
  COLUMNAS_DE_LA_COTIZACION,
  COLUMNAS_DE_LINEA,
  cotizacionDesde,
  lineasDesde,
  type CotizacionConLineas,
} from '../../entities/cotizador/hoja-de-lectura'

const NO_SE_LEYO = 'No se pudo cargar la cotización.'

// Las cotizaciones de un proyecto para la pestaña «Cotizaciones» (8.12-3, C3), con el cliente de quien mira: la RLS decide (`repuestos.cotizar` o
// `repuestos.costos.ver`). `limit 51` (el tope más uno) sobre `repuestos_cotizaciones_proyecto_id_idx`: ordena sólo las de un proyecto, así que no
// crece con la tabla. La más nueva primero.
export async function leerCotizacionesDelProyecto(
  proyectoId: string,
): Promise<Resultado<{ filas: FilaDeCotizacion[]; hayMas: boolean }>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repuestos_cotizaciones')
    .select(COLUMNAS_DE_COTIZACION)
    .eq('proyecto_id', proyectoId)
    .order('numero', { ascending: false })
    .limit(TOPE_DE_COTIZACIONES + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = filasDeCotizacionDesde(data)
  return filas === null
    ? fallo('inesperado', 'No se pudieron cargar las cotizaciones.')
    : ok(cortarAlTope(filas, TOPE_DE_COTIZACIONES))
}

// Una cotización con sus líneas para la hoja (8.12-3, C3). La cotización por su PK **y** su proyecto: una de otro proyecto, una que no existe y una que
// quien mira no ve son la misma nula. Sus líneas por `repuestos_cotizaciones_lineas_cotizacion_id_idx`, con el tope de la base (no guarda más de 200).
export async function leerCotizacion(
  proyectoId: string,
  id: string,
): Promise<Resultado<CotizacionConLineas | null>> {
  if (!z.guid().safeParse(proyectoId).success || !z.guid().safeParse(id).success) {
    return ok(null)
  }
  const supabase = await createClient()
  const leida = await supabase
    .from('repuestos_cotizaciones')
    .select(COLUMNAS_DE_LA_COTIZACION)
    .eq('id', id)
    .eq('proyecto_id', proyectoId)
    .limit(1)
  if (leida.error) {
    return { ok: false, error: errorDePostgrest(leida.error) }
  }
  if (leida.data.length === 0) return ok(null)
  const cotizacion = cotizacionDesde(leida.data[0])
  if (cotizacion === null) return fallo('inesperado', NO_SE_LEYO)
  const lineas = await supabase
    .from('repuestos_cotizaciones_lineas')
    .select(COLUMNAS_DE_LINEA)
    .eq('cotizacion_id', id)
    .order('orden')
    .order('id')
    .limit(TOPE_DE_LINEAS)
  if (lineas.error) {
    return { ok: false, error: errorDePostgrest(lineas.error) }
  }
  const filas = lineasDesde(lineas.data, cotizacion.snapshot)
  return filas === null ? fallo('inesperado', NO_SE_LEYO) : ok({ cotizacion, lineas: filas })
}
