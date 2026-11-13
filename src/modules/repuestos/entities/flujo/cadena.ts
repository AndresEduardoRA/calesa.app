import { z } from 'zod'
import { conteoAcotado, conteoCorto, type ConteoAcotado } from '@/shared/lib/conteo'
import {
  cumpleElMinimo,
  type EsquemaDeFiltros,
  type MinimoDeBusqueda,
  type ValoresDeFiltros,
} from '@/shared/lib/filtros'
import { diaEnZona } from '@/shared/lib/fechas'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'

// La «Cadena» de repuestos (8.13-3): `/repuestos?vista=cadena`, una columna por fase del flujo de repuestos. Lo puro: las claves de la URL, los filtros, las filas y cuándo se puede pedir más.
// Es la hermana de la cadena de `logistica` (6.03-1) y se parece a propósito, pero un módulo no importa a otro: lo mínimo está copiado, con su prueba.

export const VISTA_DE_CADENA = 'cadena'
export const CLAVE_DE_VISTA_DE_LA_CADENA = 'vista'
export const CLAVE_DE_BUSQUEDA_DE_LA_CADENA = 'q'
export const CLAVE_DE_PROYECTO_DE_LA_CADENA = 'proyecto'
export const CLAVE_DE_FASE_DE_LA_CADENA = 'fase'
/** La clave de la columna «Sin fase» (`?fase=`, DOM): los ítems con `fase_id` nulo. */
export const CLAVE_DE_SIN_FASE = 'sin_fase'
/** Cuántas fases admite el flujo de repuestos: es configuración, no volumen; más de eso es un error visible, nunca un corte en silencio. */
export const TOPE_DE_FASES_DE_LA_CADENA = 30

/** ¿`?vista=` pide la Cadena? */
export function esVistaDeLaCadena(texto: string | null | undefined): boolean {
  return texto === VISTA_DE_CADENA
}

export const MINIMO_DE_BUSQUEDA_DE_LA_CADENA: MinimoDeBusqueda = {
  letras: 3,
  numerosLibres: false,
  aviso: 'Escribe al menos 3 letras o números para buscar.',
}

/** El esquema de la Cadena: sólo la búsqueda por descripción; `proyecto` y `fase` viajan en la URL sin control propio. */
export function esquemaDeLaCadena(): EsquemaDeFiltros {
  return {
    busqueda: {
      clave: CLAVE_DE_BUSQUEDA_DE_LA_CADENA,
      etiqueta: 'Buscar por descripción',
      marcador: 'Descripción',
      minimo: MINIMO_DE_BUSQUEDA_DE_LA_CADENA,
    },
    filtros: [],
  }
}

export type FiltrosDeLaCadena = { q: string | null; proyecto: string | null }

/** `?proyecto=`: sólo un guid; cualquier otra cosa no filtra. */
export function leerProyectoDeLaCadena(texto: string | null | undefined): string | null {
  return typeof texto === 'string' && z.guid().safeParse(texto).success ? texto : null
}

/** Lo que filtra la URL: la búsqueda sólo si alcanza el mínimo (la interfaz no manda menos) y el proyecto sólo si es un guid. */
export function pedidoDeLaCadena(
  valores: ValoresDeFiltros,
  proyecto: string | null | undefined,
): FiltrosDeLaCadena {
  const q = valores.busqueda.trim()
  return {
    q: q !== '' && cumpleElMinimo(q, MINIMO_DE_BUSQUEDA_DE_LA_CADENA) ? q : null,
    proyecto: leerProyectoDeLaCadena(proyecto),
  }
}

export function cadenaFiltrada(filtros: FiltrosDeLaCadena): boolean {
  return filtros.q !== null || filtros.proyecto !== null
}

/** La ruta de la Cadena, con el proyecto o la búsqueda si se piden (los «Ver todas» de Inicio). */
export function rutaDeLaCadena(
  filtros: { proyecto?: string | null; q?: string | null } = {},
): string {
  const parametros = new URLSearchParams({ [CLAVE_DE_VISTA_DE_LA_CADENA]: VISTA_DE_CADENA })
  const proyecto = leerProyectoDeLaCadena(filtros.proyecto)
  if (proyecto) parametros.set(CLAVE_DE_PROYECTO_DE_LA_CADENA, proyecto)
  if (filtros.q) parametros.set(CLAVE_DE_BUSQUEDA_DE_LA_CADENA, filtros.q)
  return `/repuestos?${parametros.toString()}`
}

export type TarjetaDeRepuesto = {
  id: string
  descripcion: string
  cantidad: number
  // ISO: cuándo entró a su fase; nulo en «Sin fase».
  faseDesde: string | null
  proyecto: { id: string; numero: number; etiqueta: string | null }
}

export type ColumnaDeRepuestos = {
  // Nulo: la columna «Sin fase».
  faseId: string | null
  nombre: string | null
  color: string | null
  activa: boolean
  // Una fase final (Recibido, Perdido): sus ítems van de los más recientes a los más viejos.
  esFinal: boolean
  tarjetas: TarjetaDeRepuesto[]
  hayMas: boolean
}

export type CadenaDeRepuestos = { columnas: ColumnaDeRepuestos[] }

export type PaginaDeLaColumnaDeRepuestos = { tarjetas: TarjetaDeRepuesto[]; hayMas: boolean }

/** Las columnas del flujo con lo que trae cada una de la base. */
export type OrdenDeLaColumna = 'antiguos' | 'recientes'

export function ordenDeLaColumna(columna: Pick<ColumnaDeRepuestos, 'esFinal'>): OrdenDeLaColumna {
  return columna.esFinal ? 'recientes' : 'antiguos'
}

export function claveDeColumna(faseId: string | null): string {
  return faseId ?? CLAVE_DE_SIN_FASE
}

/** La columna que pide `?fase=`: la que tiene esa clave; si no (ajena), la primera; nulo si no hay columnas. */
export function columnaElegida(
  columnas: readonly ColumnaDeRepuestos[],
  parametro: string | null | undefined,
): ColumnaDeRepuestos | null {
  return columnas.find((c) => claveDeColumna(c.faseId) === parametro) ?? columnas[0] ?? null
}

/** El número de la columna: lo cargado, y «+» si hay más. Nunca un total exacto (`.claude/rules/escala.md`). */
export function conteoDeLaColumna(columna: ColumnaDeRepuestos): ConteoAcotado {
  return columna.hayMas
    ? { n: columna.tarjetas.length, hayMas: true }
    : conteoAcotado(columna.tarjetas.length, TOPE_DE_LO_CARGADO)
}

/** «12» o «50+», lo que va en el encabezado. */
export function numeroDeLaColumna(columna: ColumnaDeRepuestos): string {
  return conteoCorto(conteoDeLaColumna(columna))
}

/** «12 ítems», «1 ítem», «más de 50 ítems»: lo que lee quien no ve el «50+». */
export function frasePorColumna(columna: ColumnaDeRepuestos): string {
  const n = columna.tarjetas.length
  const cuantos = `${String(n)} ${n === 1 ? 'ítem' : 'ítems'}`
  return columna.hayMas ? `más de ${cuantos}` : cuantos
}

/** ¿Se puede pedir más? Hay más en la base y no se llegó al tope de lo cargado. */
export function puedeVerMas(columna: Pick<ColumnaDeRepuestos, 'hayMas' | 'tarjetas'>): boolean {
  return columna.hayMas && columna.tarjetas.length < TOPE_DE_LO_CARGADO
}

/** ¿Se llegó al tope de lo cargado con más por ver? Entonces se avisa en vez de seguir. */
export function enElTope(columna: Pick<ColumnaDeRepuestos, 'hayMas' | 'tarjetas'>): boolean {
  return columna.hayMas && columna.tarjetas.length >= TOPE_DE_LO_CARGADO
}

/** Suma las tarjetas que llegaron sin repetir las que ya estaban (otra persona pudo moverlas entre dos pedidos) y sin pasar del tope. */
export function agregarTarjetas(
  columna: ColumnaDeRepuestos,
  nuevas: readonly TarjetaDeRepuesto[],
  hayMas: boolean,
): ColumnaDeRepuestos {
  const vistas = new Set(columna.tarjetas.map((t) => t.id))
  const sumadas: TarjetaDeRepuesto[] = []
  for (const tarjeta of nuevas) {
    if (!vistas.has(tarjeta.id)) {
      vistas.add(tarjeta.id)
      sumadas.push(tarjeta)
    }
  }
  return {
    ...columna,
    tarjetas: [...columna.tarjetas, ...sumadas].slice(0, TOPE_DE_LO_CARGADO),
    hayMas,
  }
}

export type CursorDeLaColumna = { desde: string | null; id: string }

/**
 * El cursor del siguiente pedido: la última tarjeta cargada. En una fase es `(fase_desde, id)` y se piden los dos; «Sin fase» no tiene `fase_desde` y va sólo por `id`. Nulo si no hay
 * tarjetas o a la última de una fase le falta la fecha (entonces no hay «Ver más»).
 */
export function cursorDeLaColumna(
  columna: Pick<ColumnaDeRepuestos, 'faseId' | 'tarjetas'>,
): CursorDeLaColumna | null {
  const ultima = columna.tarjetas.at(-1)
  if (!ultima) return null
  if (columna.faseId === null) return { desde: null, id: ultima.id }
  return ultima.faseDesde ? { desde: ultima.faseDesde, id: ultima.id } : null
}

const MS_POR_DIA = 86_400_000

/** La línea de la tarjeta: «Entró hoy», «1 día en la fase», «3 días en la fase». Nada si no se sabe desde cuándo. */
export function textoDeLosDiasEnLaFase(
  faseDesde: string | null,
  ahora: Date = new Date(),
): string | null {
  if (faseDesde === null) return null
  const desde = Date.parse(diaEnZona(faseDesde))
  const hasta = Date.parse(diaEnZona(ahora.toISOString()))
  if (Number.isNaN(desde) || Number.isNaN(hasta)) return null
  const dias = Math.max(0, Math.round((hasta - desde) / MS_POR_DIA))
  if (dias === 0) return 'Entró hoy'
  return `${String(dias)} ${dias === 1 ? 'día' : 'días'} en la fase`
}
