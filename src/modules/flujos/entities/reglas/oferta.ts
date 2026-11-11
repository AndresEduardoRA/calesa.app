// La oferta de transporte de un flujo: qué puertos de origen, de destino y qué navieras se ofrecen al cargar el transporte. Lista vacía = se ofrecen todos.
import { z } from 'zod'
import { cortarAlTope } from '@/shared/lib/conteo'

export const TOPE_DE_LA_OFERTA = 200

export const TEXTO_DE_OFERTA_VACIA = 'Vacío: se ofrecen todos.'
export const SIN_PUERTOS = 'Todavía no hay puertos cargados. Se cargan en Logística.'
export const SIN_NAVIERAS = 'Todavía no hay navieras cargadas. Se cargan en Logística.'

export type ElementoDeOferta = { id: string; nombre: string; activo: boolean }

export type OfertaDeTransporte = {
  transporte: boolean
  puertosOrigen: ElementoDeOferta[]
  puertosDestino: ElementoDeOferta[]
  navieras: ElementoDeOferta[]
}

// Los puertos y navieras activos que se pueden marcar (se lee uno de más para saber si hay más).
export type CatalogoDeTransporte = {
  puertos: ElementoDeOferta[]
  navieras: ElementoDeOferta[]
  hayMasPuertos: boolean
  hayMasNavieras: boolean
}

const elemento = z.object({ id: z.guid(), nombre: z.string(), activo: z.boolean() })
const cruda = z.object({
  transporte: z.boolean(),
  puertos_origen: z.array(elemento),
  puertos_destino: z.array(elemento),
  navieras: z.array(elemento),
})

// `flujo_oferta()`, o nulo si no se entiende.
export function ofertaDesde(crudo: unknown): OfertaDeTransporte | null {
  const r = cruda.safeParse(crudo)
  if (!r.success) {
    return null
  }
  return {
    transporte: r.data.transporte,
    puertosOrigen: r.data.puertos_origen,
    puertosDestino: r.data.puertos_destino,
    navieras: r.data.navieras,
  }
}

// El catálogo desde lo que devolvieron las dos consultas (con `tope + 1` filas cada una).
export function catalogoDesde(
  puertos: readonly ElementoDeOferta[],
  navieras: readonly ElementoDeOferta[],
): CatalogoDeTransporte {
  const p = cortarAlTope(puertos, TOPE_DE_LA_OFERTA)
  const n = cortarAlTope(navieras, TOPE_DE_LA_OFERTA)
  return { puertos: p.filas, navieras: n.filas, hayMasPuertos: p.hayMas, hayMasNavieras: n.hayMas }
}

// Lo que se puede marcar en un grupo: los activos del catálogo y, aparte, los ya guardados que dejaron de estar activos o que el tope dejó fuera:
// se ven rotulados para poder quitarlos (la base los acepta).
export function elegibles(
  catalogo: readonly ElementoDeOferta[],
  guardados: readonly ElementoDeOferta[],
): ElementoDeOferta[] {
  const ids = new Set(catalogo.map((e) => e.id))
  const extra = guardados.filter((g) => !ids.has(g.id))
  return [...catalogo, ...extra]
}

export function vacioDe(lista: readonly unknown[]): boolean {
  return lista.length === 0
}

export type BorradorDeOferta = {
  puertosOrigen: readonly string[]
  puertosDestino: readonly string[]
  navieras: readonly string[]
}

function ordenados(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort()
}

// Lo guardado como ids, para compararlo con el borrador.
export function borradorDe(oferta: OfertaDeTransporte): BorradorDeOferta {
  return {
    puertosOrigen: oferta.puertosOrigen.map((e) => e.id),
    puertosDestino: oferta.puertosDestino.map((e) => e.id),
    navieras: oferta.navieras.map((e) => e.id),
  }
}

// Una firma que no depende del orden: la pantalla reinicia el borrador cuando lo guardado cambia de verdad, no cuando sólo cambia la versión del flujo.
export function firmaDeOferta(oferta: OfertaDeTransporte | BorradorDeOferta): string {
  const b = 'transporte' in oferta ? borradorDe(oferta) : oferta
  return JSON.stringify([
    ordenados(b.puertosOrigen),
    ordenados(b.puertosDestino),
    ordenados(b.navieras),
  ])
}

// Si el borrador pide algo distinto de lo guardado.
export function cambioDeOferta(guardada: OfertaDeTransporte, borrador: BorradorDeOferta): boolean {
  return firmaDeOferta(guardada) !== firmaDeOferta(borrador)
}
