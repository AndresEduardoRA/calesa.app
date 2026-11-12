import 'server-only'
import { errorDePostgrest, ok, type ErrorPostgrest, type Resultado } from '@/shared/lib/errores'
import type { Cursor } from '@/shared/lib/paginacion'
import { POR_ALTA } from '@/shared/lib/paginacion'
import {
  aplicarCursor,
  ordenarPorCursor,
  type Filtrable,
  type Ordenable,
} from '@/shared/lib/supabase/consultas'
import { FILAS_POR_PEDIDO, type Rango } from '../entities/exportacion'

// Lo común de leer por páginas una entidad de «exportar todo» (9.05-2): el rango de `creado_en`, el cursor `(creado_en, id)` en orden de alta
// (`creado_en desc, id desc`) y el conteo hasta el tope. Sirve igual para `.rpc()` y para `.from()`.

export function enElRango<Consulta extends Filtrable<Consulta> & Ordenable<Consulta>>(
  consulta: Consulta,
  rango: Rango,
  cursor: Cursor | null,
): Consulta {
  const desde = rango.desdeEn === null ? consulta : consulta.gte('creado_en', rango.desdeEn)
  const hasta = rango.hastaIncluido
    ? desde.lte('creado_en', rango.hastaEn)
    : desde.lt('creado_en', rango.hastaEn)
  return ordenarPorCursor(aplicarCursor(hasta, cursor, POR_ALTA), cursor, POR_ALTA)
}

export const siguienteDe = (filas: readonly { id: string; creado_en: string }[]): Cursor | null => {
  const ultima = filas.at(-1)
  return filas.length < FILAS_POR_PEDIDO || ultima === undefined
    ? null
    : { instante: ultima.creado_en, id: ultima.id, sentido: 'siguiente' }
}

type PaginaDeIds = PromiseLike<{
  data: { id: string; creado_en: string }[] | null
  error: ErrorPostgrest | null
}>

// Hasta `tope + 1` ids, de a una página, nunca un total exacto: dice cuántos hay hasta el tope y si había más. `pedirIds` arma la consulta de
// `id, creado_en` de una página (con `enElRango` y `.limit(FILAS_POR_PEDIDO)`).
export async function contarHasta(
  pedirIds: (cursor: Cursor | null) => PaginaDeIds,
  tope: number,
): Promise<Resultado<{ n: number; hayMas: boolean }>> {
  let cursor: Cursor | null = null
  let leidos = 0
  while (leidos <= tope) {
    const { data, error } = await pedirIds(cursor)
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const filas = data ?? []
    leidos += filas.length
    cursor = siguienteDe(filas)
    if (cursor === null) {
      break
    }
  }
  return ok({ n: Math.min(leidos, tope), hayMas: leidos > tope })
}

export const comoObjeto = (valor: unknown): Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {}
