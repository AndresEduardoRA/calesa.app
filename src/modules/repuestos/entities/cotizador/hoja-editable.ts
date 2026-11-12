// La hoja editable de una cotización de repuestos en borrador (8.12-4, C1–C4). Pura. Lo que la persona tipea en una `XCell` llega como `number` y pasa
// a **texto exacto** antes de entrar al estado (`montoDeCelda`): nada viaja a la base como `float`. El total en vivo usa la misma fórmula exacta que la
// base (`calcularLinea`) y sólo informa: lo que vale es lo que guarda `repuestos_cotizacion_guardar`, y la hoja nace de nuevo de lo guardado (D45).
import { CAMPOS_DE_CONFIGURACION, decimalCanonico } from './configuracion'
import {
  calcularLinea,
  totalDeLaCotizacion,
  type BloqueDeCotizacion,
  type LineaCalculada,
} from './formula'
import type { LineaDeLectura } from './hoja-de-lectura'
import type { SnapshotDelCotizador } from './snapshot'

export type LineaEditable = {
  id: string
  itemId: string | null
  descripcion: string
  bloque: BloqueDeCotizacion
  cantidad: number
  // Texto exacto o nulo (nulo no es 0).
  costo: string | null
  // La **escrita**: nula = la sugerida del tramo (↺, D46).
  logistica: string | null
  // El monto de una caja del snapshot, '0.00' = «Sin caja», nula = sin elegir (D44).
  caja: string | null
}

export type ItemParaCotizar = { id: string; descripcion: string; cantidad: number }

export const SIN_CAJA = '0.00'
export const CANTIDAD_MAXIMA = 100000
export const LARGO_DE_LA_DESCRIPCION = 200
export const LARGO_DE_LAS_NOTAS = 2000
export const MENSAJE_DE_CANTIDAD = 'La cantidad es un entero de 1 a 100000.'

export type CeldaLeida<T> = { ok: true; valor: T } | { ok: false; error: string }

/** El número que emite la celda de un monto como texto exacto a 2 decimales; vacío es nulo. */
export function montoDeCelda(valor: number | null): CeldaLeida<string | null> {
  if (valor === null) return { ok: true, valor: null }
  // `XCell` emite a 15 cifras y el tope tiene 14: `String()` devuelve lo tipeado. Un exponente o un negativo no pasan.
  const leido = decimalCanonico(String(valor), CAMPOS_DE_CONFIGURACION.montoDeTramo)
  return leido.ok ? { ok: true, valor: leido.valor } : leido
}

/** La cantidad de la celda: un entero de 1 a 100000 (el texto de la base). */
export function cantidadDeCelda(valor: number | null): CeldaLeida<number> {
  if (valor === null || !Number.isInteger(valor) || valor < 1 || valor > CANTIDAD_MAXIMA) {
    return { ok: false, error: MENSAJE_DE_CANTIDAD }
  }
  return { ok: true, valor }
}

/** La línea leída como editable: si la logística era la sugerida, la escrita queda nula. */
export function lineaEditableDesde(l: LineaDeLectura): LineaEditable {
  return {
    id: l.id,
    itemId: l.itemId,
    descripcion: l.descripcion,
    bloque: l.bloque,
    cantidad: l.cantidad,
    costo: l.costo,
    logistica: l.esSugerida ? null : l.logistica,
    caja: l.caja,
  }
}

function cantidadDelItem(cantidad: number): number {
  return cantidadDeCelda(cantidad).ok ? cantidad : 1
}

/** Una línea nueva, libre o desde un ítem; nace sin costo, sin logística escrita y sin caja elegida (D44). */
export function lineaNueva(
  id: string,
  bloque: BloqueDeCotizacion,
  item?: ItemParaCotizar,
): LineaEditable {
  return {
    id,
    itemId: item?.id ?? null,
    descripcion: item ? item.descripcion.slice(0, LARGO_DE_LA_DESCRIPCION) : '',
    bloque,
    cantidad: item ? cantidadDelItem(item.cantidad) : 1,
    costo: null,
    logistica: null,
    caja: null,
  }
}

/** Los ítems que todavía no están en una línea (la base rechaza un ítem repetido). */
export function itemsDisponibles(
  items: readonly ItemParaCotizar[],
  lineas: readonly LineaEditable[],
): ItemParaCotizar[] {
  const usados = new Set(lineas.map((l) => l.itemId).filter((id) => id !== null))
  return items.filter((i) => !usados.has(i.id))
}

export type HojaCalculada = {
  lineas: Readonly<Record<string, LineaCalculada>>
  // Nulo si falta el total de una línea o no hay líneas.
  total: string | null
}

/** Cada línea con su sugerida y su total, y el total de la cotización, con la fórmula de la base. */
export function calcularHoja(
  snapshot: SnapshotDelCotizador,
  lineas: readonly LineaEditable[],
): HojaCalculada {
  const calculadas: Record<string, LineaCalculada> = {}
  const totales: (string | null)[] = []
  for (const l of lineas) {
    const c = calcularLinea(snapshot, l)
    calculadas[l.id] = c
    totales.push(c.total)
  }
  return { lineas: calculadas, total: totalDeLaCotizacion(totales) }
}

export type LineaParaGuardar = LineaEditable

/** Las líneas que se mandan a guardar, importado antes que local; nunca el total ni las sugerencias (las calcula la base). */
export function pedidoDeGuardar(lineas: readonly LineaEditable[]): LineaParaGuardar[] {
  const orden = (b: BloqueDeCotizacion) => (b === 'importado' ? 0 : 1)
  return [...lineas]
    .map((l, i) => ({ l, i }))
    .sort((a, b) => orden(a.l.bloque) - orden(b.l.bloque) || a.i - b.i)
    .map(({ l }) => ({
      id: l.id,
      itemId: l.itemId,
      descripcion: l.descripcion,
      bloque: l.bloque,
      cantidad: l.cantidad,
      costo: l.costo,
      logistica: l.logistica,
      caja: l.caja,
    }))
}

function mismaLinea(a: LineaEditable, b: LineaEditable): boolean {
  return (
    a.id === b.id &&
    a.itemId === b.itemId &&
    a.descripcion === b.descripcion &&
    a.bloque === b.bloque &&
    a.cantidad === b.cantidad &&
    a.costo === b.costo &&
    a.logistica === b.logistica &&
    a.caja === b.caja
  )
}

/** Si lo local difiere de lo leído (líneas o notas). */
export function hayCambios(
  leidas: readonly LineaEditable[],
  locales: readonly LineaEditable[],
  notasLeidas: string,
  notasLocales: string,
): boolean {
  if (notasLeidas !== notasLocales || leidas.length !== locales.length) return true
  return leidas.some((l, i) => {
    const otra = locales[i]
    return otra === undefined || !mismaLinea(l, otra)
  })
}

export const MOTIVOS_PARA_NO_ACEPTAR = {
  permiso: 'Aceptar fija el precio de los ítems: necesitas el permiso para editar ítems.',
  sinGuardar: 'Guarda los cambios antes de aceptar.',
  sinTotal: 'Para aceptarla, cada línea necesita su total.',
} as const

/** Por qué «Aceptar» está apagado, o `null` si se puede (sólo con lo guardado, D47). */
export function motivoParaNoAceptar({
  puedeEditarItems,
  sinGuardar,
  totalGuardado,
}: {
  puedeEditarItems: boolean
  sinGuardar: boolean
  totalGuardado: string | null
}): string | null {
  if (!puedeEditarItems) return MOTIVOS_PARA_NO_ACEPTAR.permiso
  if (sinGuardar) return MOTIVOS_PARA_NO_ACEPTAR.sinGuardar
  if (totalGuardado === null) return MOTIVOS_PARA_NO_ACEPTAR.sinTotal
  return null
}
