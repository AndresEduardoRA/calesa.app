import 'server-only'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  COLUMNAS_DE_INICIO,
  repuestosDeInicioDesde,
  topeDeInicio,
  type RepuestoDeInicio,
} from '../../entities/flujo/inicio'

// Los bloques de repuestos de Inicio (8.13-4): PostgREST bajo la RLS de quien mira (`repuestos.ver`; sin él, cero filas y el bloque cae a su vacío). Una consulta por bloque con
// `limit tope + 1` (nunca un total), la fase y el proyecto embebidos con `!inner` (nada por fila). El orden `fase_desde` sale de `repuestos_items_fase_id_idx` y ordena sólo
// lo que está en vuelo (ítems vivos, sin stock, en una fase no final); el índice `(fase_id, fase_desde, id)` es el abierto 8-13c.

export type RepuestosDeInicio = { filas: RepuestoDeInicio[]; hayMas: boolean }

async function leerPendientes(
  tope: number,
  soloConVehiculo: boolean,
): Promise<Resultado<RepuestosDeInicio>> {
  const valido = topeDeInicio(tope)
  if (!valido.ok) return valido
  const supabase = await createClient()
  let consulta = supabase
    .from('repuestos_items')
    .select(COLUMNAS_DE_INICIO)
    .is('eliminado_en', null)
    .is('en_stock_desde', null)
    .eq('fase.es_final', false)
    .is('proyecto.eliminado_en', null)
  if (soloConVehiculo) consulta = consulta.not('proyecto.vehiculo_id', 'is', null)
  const { data, error } = await consulta
    .order('fase_desde', { ascending: true })
    .order('id', { ascending: true })
    .limit(valido.data + 1)
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const filas = repuestosDeInicioDesde(data)
  if (!filas.ok) return filas
  return ok(cortarAlTope(filas.data, valido.data))
}

/** «Repuestos por mover»: los ítems en una fase no final, fuera de stock, de un proyecto vivo; el que lleva más tiempo en su fase, primero. */
export function leerRepuestosPorMover(tope: number): Promise<Resultado<RepuestosDeInicio>> {
  return leerPendientes(tope, false)
}

/** «Esperas que destraban vehículos»: lo mismo, pero sólo de proyectos con vehículo (el cruce exacto con la fase del vehículo es el abierto 8-13a). */
export function leerEsperasDeInicio(tope: number): Promise<Resultado<RepuestosDeInicio>> {
  return leerPendientes(tope, true)
}
