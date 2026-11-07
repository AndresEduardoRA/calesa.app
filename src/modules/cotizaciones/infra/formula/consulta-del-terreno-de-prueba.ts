// Lo de prueba de la vista previa del editor de la fórmula (4.21-3a-2, P5), sobre el cliente que recibe: el del navegador, con la sesión de quien edita. Son a lo
// sumo `1 + 1 + MAXIMO_DE_PEDIDOS_DE_FILAS` lecturas, en tres tiempos y ninguna por fila:
//  1. los tipos de cambio activos que nombran los nodos (`tipos_cambio_clave_key`);
//  2. las tablas vivas que la fórmula nombra, la del origen o la compartida (`tablas_referencia_origen_id_clave_key`);
//  3. sus filas por páginas (`tablas_referencia_filas_tabla_orden_idx`): PostgREST nunca da más de 1.000 por pedido (`max_rows`), así que una tabla se lee si cabe en una
//     página y la última tabla de una página llena queda pendiente para el pedido siguiente (`aceptarPagina()`).
// Quien configura el origen ya lee las tres tablas con su policy (`formulas: leer`): no se abre nada nuevo. Un fallo de la base es un fallo, nunca su mensaje.
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { Database } from '@/shared/types/database.types'
import { esquemaFila, type FilaDeTabla } from '../../entities/formula'
import {
  aceptarPagina,
  elegirTablas,
  FILAS_POR_PAGINA,
  MAXIMO_DE_CLAVES_DE_CAMBIO,
  MAXIMO_DE_PEDIDOS_DE_FILAS,
  MAXIMO_DE_TABLAS_VIVAS,
  type AvisoDelTerreno,
  type TerrenoDePrueba,
} from '../../entities/formula/terreno-de-prueba'

type Cliente = SupabaseClient<Database>

// Lo que la fórmula nombra: las claves de sus tablas vivas y de sus tipos de cambio (`tablasVivasDe()` y `clavesDeCambioDe()`).
export type PedidoDelTerreno = { origenId: string; tablas: string[]; cambios: string[] }

// Tipos de cambio activos por clave: `tipos_cambio_clave_key`.
export function consultaDeLosTiposDeCambio(cliente: Cliente, claves: string[]) {
  return cliente
    .from('tipos_cambio')
    .select('clave, valor')
    .in('clave', claves)
    .eq('activo', true)
    .limit(MAXIMO_DE_CLAVES_DE_CAMBIO)
}

// Las tablas activas de esas claves, del origen o compartidas: `tablas_referencia_origen_id_clave_key` (origen_id, clave). Dos por clave como mucho.
export function consultaDeLasTablas(cliente: Cliente, origenId: string, claves: string[]) {
  return cliente
    .from('tablas_referencia')
    .select('id, origen_id, clave, activa')
    .in('clave', claves)
    .or(`origen_id.eq.${origenId},origen_id.is.null`)
    .eq('activa', true)
    .limit(2 * MAXIMO_DE_TABLAS_VIVAS)
}

// Las filas de las tablas pendientes, en su orden: `tablas_referencia_filas_tabla_orden_idx (tabla_id, orden, id)`, sin ordenar. `FILAS_POR_PAGINA` es el `max_rows`.
export function consultaDeLasFilas(cliente: Cliente, tablaIds: string[]) {
  return cliente
    .from('tablas_referencia_filas')
    .select('tabla_id, valores')
    .in('tabla_id', tablaIds)
    .eq('activa', true)
    .order('tabla_id')
    .order('orden')
    .order('id')
    .limit(FILAS_POR_PAGINA)
}

const esquemaDeUnCambio = z.object({ clave: z.string(), valor: z.number() })
const esquemaDeUnaTabla = z.object({
  id: z.guid(),
  origen_id: z.guid().nullable(),
  clave: z.string(),
  activa: z.boolean(),
})
const esquemaDeUnaFila = z.object({ tabla_id: z.guid(), valores: z.unknown() })

const SIN_LEER = 'No pudimos leer los tipos de cambio y las tablas.'
const sinLeer = (): Resultado<never> => fallo('inesperado', SIN_LEER)

async function leerLosCambios(
  cliente: Cliente,
  claves: string[],
): Promise<Resultado<Record<string, number>>> {
  const { data, error } = await consultaDeLosTiposDeCambio(cliente, claves)
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const filas = z.array(esquemaDeUnCambio).safeParse(data)
  if (!filas.success) return sinLeer()
  // Un valor que no es positivo no lo acepta el motor: es como si no hubiera.
  return ok(
    Object.fromEntries(filas.data.filter((f) => f.valor > 0).map((f) => [f.clave, f.valor])),
  )
}

type Leidas = {
  aceptadas: Map<string, unknown[]>
  pendientes: string[]
  descartadas: Set<string>
}

async function leerLasFilas(cliente: Cliente, ids: string[]): Promise<Resultado<Leidas>> {
  const leidas: Leidas = { aceptadas: new Map(), pendientes: ids, descartadas: new Set() }
  for (
    let pedido = 0;
    pedido < MAXIMO_DE_PEDIDOS_DE_FILAS && leidas.pendientes.length > 0;
    pedido += 1
  ) {
    const { data, error } = await consultaDeLasFilas(cliente, leidas.pendientes)
    if (error) return { ok: false, error: errorDePostgrest(error) }
    const filas = z.array(esquemaDeUnaFila).safeParse(data)
    if (!filas.success) return sinLeer()
    const pagina = aceptarPagina(leidas.pendientes, filas.data)
    for (const [id, de] of pagina.aceptadas) leidas.aceptadas.set(id, de)
    if (pagina.descartada !== null) leidas.descartadas.add(pagina.descartada)
    leidas.pendientes = pagina.pendientes
  }
  return ok(leidas)
}

// Lo que dice una tabla viva tras leer: sus filas o por qué no se usa.
function deUnaTabla(
  clave: string,
  id: string | undefined,
  leidas: Leidas | null,
): { filas: FilaDeTabla[] } | { aviso: AvisoDelTerreno } {
  if (id === undefined) return { aviso: { codigo: 'tabla_ausente', clave } }
  if (leidas?.descartadas.has(id)) return { aviso: { codigo: 'tabla_grande', clave } }
  if (leidas?.pendientes.includes(id)) return { aviso: { codigo: 'tabla_sin_leer', clave } }
  const propias = z.array(esquemaFila).safeParse(leidas?.aceptadas.get(id) ?? [])
  return propias.success ? { filas: propias.data } : { aviso: { codigo: 'tabla_ilegible', clave } }
}

async function leerLasTablas(
  cliente: Cliente,
  origenId: string,
  claves: string[],
): Promise<Resultado<{ tablas: Record<string, FilaDeTabla[]>; avisos: AvisoDelTerreno[] }>> {
  const candidatas = await consultaDeLasTablas(cliente, origenId, claves)
  if (candidatas.error) return { ok: false, error: errorDePostgrest(candidatas.error) }
  const lista = z.array(esquemaDeUnaTabla).safeParse(candidatas.data)
  if (!lista.success) return sinLeer()
  const elegidas = elegirTablas(lista.data, origenId)
  const ids = claves.flatMap((clave) => elegidas.get(clave) ?? [])
  const leidas = ids.length > 0 ? await leerLasFilas(cliente, ids) : null
  if (leidas !== null && !leidas.ok) return leidas
  const tablas: Record<string, FilaDeTabla[]> = {}
  const avisos: AvisoDelTerreno[] = []
  for (const clave of claves) {
    const una = deUnaTabla(clave, elegidas.get(clave), leidas?.data ?? null)
    if ('filas' in una) tablas[clave] = una.filas
    else avisos.push(una.aviso)
  }
  return ok({ tablas, avisos })
}

export async function leerElTerrenoSobre(
  cliente: Cliente,
  pedido: PedidoDelTerreno,
): Promise<Resultado<TerrenoDePrueba>> {
  const cambios = pedido.cambios.slice(0, MAXIMO_DE_CLAVES_DE_CAMBIO)
  const claves = pedido.tablas.slice(0, MAXIMO_DE_TABLAS_VIVAS)
  const avisos: AvisoDelTerreno[] = []

  let tipos: Record<string, number> = {}
  if (cambios.length > 0) {
    const leidos = await leerLosCambios(cliente, cambios)
    if (!leidos.ok) return leidos
    tipos = leidos.data
    for (const clave of cambios) {
      if (!Object.hasOwn(tipos, clave)) avisos.push({ codigo: 'cambio_ausente', clave })
    }
  }

  let tablas: Record<string, FilaDeTabla[]> = {}
  if (claves.length > 0) {
    const leidas = await leerLasTablas(cliente, pedido.origenId, claves)
    if (!leidas.ok) return leidas
    tablas = leidas.data.tablas
    avisos.push(...leidas.data.avisos)
  }
  if (pedido.tablas.length > claves.length) avisos.push({ codigo: 'mas_tablas' })
  if (pedido.cambios.length > cambios.length) avisos.push({ codigo: 'mas_cambios' })
  return ok({ tipos_cambio: tipos, tablas, avisos })
}
