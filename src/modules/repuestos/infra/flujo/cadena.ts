import 'server-only'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, ok, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_COLUMNA } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import { aplicarCursor, patronContiene } from '@/shared/lib/supabase/consultas'
import {
  TOPE_DE_FASES_DE_LA_CADENA,
  type CadenaDeRepuestos,
  type FiltrosDeLaCadena,
  type PaginaDeLaColumnaDeRepuestos,
} from '../../entities/flujo/cadena'
import {
  COLUMNAS_DE_LA_FASE,
  COLUMNAS_DE_LA_TARJETA,
  columnasDe,
  fasesDesde,
  tarjetasDesde,
} from '../../entities/flujo/cadena-filas'
import type { PedidoDeLaColumnaDeRepuestos } from '../../entities/flujo/repositorio'

// La Cadena de repuestos (8.13-3): PostgREST bajo la RLS de quien mira (`repuestos.ver`; sin él, cero filas). Una consulta por fase del flujo (≤ 30, hoy 5) más «Sin fase», todas en paralelo,
// cada una con `limit TAMANO_DE_COLUMNA + 1` sobre `repuestos_items_fase_id_idx`, y «Ver más» por cursor `(fase_desde, id)` sin `offset`. El proyecto va embebido: ninguna lectura por tarjeta.

// `fase_desde` ascendente (los que llevan más tiempo primero) o descendente (los más recientes primero, en una fase final).
const ordenDeLaFase = (orden: PedidoDeLaColumnaDeRepuestos['orden']) => ({
  columna: 'fase_desde',
  ascendente: orden === 'antiguos',
})

async function leerColumna(
  pedido: PedidoDeLaColumnaDeRepuestos,
): Promise<Resultado<PaginaDeLaColumnaDeRepuestos>> {
  const supabase = await createClient()
  const { faseId, cursor, filtros } = pedido
  // El orden de «Sin fase» es sólo por `id` (no tiene `fase_desde`).
  const orden = ordenDeLaFase(pedido.orden)
  let consulta = supabase
    .from('repuestos_items')
    .select(COLUMNAS_DE_LA_TARJETA)
    .is('eliminado_en', null)
    .is('proyecto.eliminado_en', null)
  consulta = faseId === null ? consulta.is('fase_id', null) : consulta.eq('fase_id', faseId)
  if (filtros.proyecto) consulta = consulta.eq('proyecto_id', filtros.proyecto)
  if (filtros.q) consulta = consulta.ilike('descripcion', patronContiene(filtros.q))
  if (cursor) {
    consulta =
      faseId === null || cursor.desde === null
        ? consulta.gt('id', cursor.id)
        : aplicarCursor(
            consulta,
            { instante: cursor.desde, id: cursor.id, sentido: 'siguiente' },
            orden,
          )
  }
  // «Sin fase» va sólo por `id`; una fase, por `(fase_desde, id)` en el sentido de su orden.
  const ordenada =
    faseId === null
      ? consulta.order('id', { ascending: true })
      : consulta
          .order('fase_desde', { ascending: orden.ascendente })
          .order('id', { ascending: orden.ascendente })
  const { data, error } = await ordenada.limit(TAMANO_DE_COLUMNA + 1)
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const tarjetas = tarjetasDesde(data)
  if (!tarjetas.ok) return tarjetas
  const { filas, hayMas } = cortarAlTope(tarjetas.data, TAMANO_DE_COLUMNA)
  return ok({ tarjetas: filas, hayMas })
}

export const leerColumnaDeRepuestos = leerColumna

export async function leerCadenaDeRepuestos(
  filtros: FiltrosDeLaCadena,
): Promise<Resultado<CadenaDeRepuestos>> {
  const supabase = await createClient()
  // El flujo de repuestos es una sola fila de `flujos` (`ambito = 'repuestos'`).
  const { data, error } = await supabase
    .from('fases')
    .select(`${COLUMNAS_DE_LA_FASE}, flujo:flujos!inner(ambito)`)
    .eq('flujo.ambito', 'repuestos')
    .order('orden', { ascending: true })
    .order('id', { ascending: true })
    .limit(TOPE_DE_FASES_DE_LA_CADENA + 1)
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const fases = fasesDesde(data)
  if (!fases.ok) return fases
  const lecturas = await Promise.all([
    leerColumna({ faseId: null, orden: 'antiguos', cursor: null, filtros }),
    ...fases.data.map((fase) =>
      leerColumna({
        faseId: fase.id,
        orden: fase.esFinal ? 'recientes' : 'antiguos',
        cursor: null,
        filtros,
      }),
    ),
  ])
  const porFase = new Map<string, PaginaDeLaColumnaDeRepuestos>()
  let sinFase: PaginaDeLaColumnaDeRepuestos = { tarjetas: [], hayMas: false }
  for (const [i, lectura] of lecturas.entries()) {
    if (!lectura.ok) return lectura
    if (i === 0) sinFase = lectura.data
    else {
      const fase = fases.data[i - 1]
      if (fase) porFase.set(fase.id, lectura.data)
    }
  }
  return ok({ columnas: columnasDe(fases.data, { sinFase, porFase }) })
}
