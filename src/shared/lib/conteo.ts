// Un número que se muestra nunca es el total exacto: crece con la tabla (`.claude/rules/escala.md`).
// La consulta pide `tope + 1` filas (o cuenta sobre un subselect con `limit tope + 1`) y de ahí sale
// «37» o «más de 50». Sirve cuando el número ayuda a decidir; si sólo adorna, no se muestra.
import { LOCALE_POR_DEFECTO, formatearNumero } from './formato'

export type ConteoAcotado = {
  // Lo contado, sin pasar del tope.
  n: number
  // Había más que el tope: `n` es el tope y no el total.
  hayMas: boolean
}

// El tope de los conteos de configuración que ayudan a decidir (cuántos vehículos usan una categoría,
// a cuántos leads se puso una etiqueta). Las listas que se dibujan usan el tope de lo cargado.
export const TOPE_DEL_CONTEO = 1000

// De lo que devolvió una consulta de `tope + 1` filas (o de un `count` sobre ese subselect).
export function conteoAcotado(leidas: number, tope: number): ConteoAcotado {
  return leidas > tope ? { n: tope, hayMas: true } : { n: leidas, hayMas: false }
}

type Opciones = { locale?: string }

// En una frase: «37» o «más de 50».
export function conteoEnFrase(
  conteo: ConteoAcotado,
  { locale = LOCALE_POR_DEFECTO }: Opciones = {},
) {
  const texto = formatearNumero(conteo.n, { locale })
  return conteo.hayMas ? `más de ${texto}` : texto
}

// En una cabecera o una pestaña, donde no cabe una frase: «37» o «50+».
export function conteoCorto(conteo: ConteoAcotado, { locale = LOCALE_POR_DEFECTO }: Opciones = {}) {
  const texto = formatearNumero(conteo.n, { locale })
  return conteo.hayMas ? `${texto}+` : texto
}

// Un conteo acotado después de que una fila entra (`delta` +1) o sale (-1) de lo contado. Si ya había más
// que el tope, no se sabe cuánto: sigue igual. Si no, el número es exacto y se mueve.
export function conteoConCambio(conteo: ConteoAcotado, delta: number, tope: number): ConteoAcotado {
  return conteo.hayMas ? conteo : conteoAcotado(Math.max(0, conteo.n + delta), tope)
}

// «un vehículo», «37 vehículos» o «más de 100 vehículos», de una cantidad leída con `tope + 1` (la
// consulta devuelve a lo sumo `tope + 1`, y más que el tope es «más de»). `plural` lleva el sustantivo.
export function cantidadAcotada(
  leidas: number,
  tope: number,
  sustantivo: { singular: string; plural: string },
  opciones: Opciones = {},
): string {
  const conteo = conteoAcotado(leidas, tope)
  if (!conteo.hayMas && conteo.n === 1) {
    return `1 ${sustantivo.singular}`
  }
  return `${conteoEnFrase(conteo, opciones)} ${sustantivo.plural}`
}
