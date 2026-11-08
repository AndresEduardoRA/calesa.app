// Editar una tabla de referencia en memoria (4.23-2, P1 del 4.23-1): el editor cambia celdas, suma, quita y mueve filas sin escribir nada; «Publicar» manda la tabla
// entera en su orden (`tabla_referencia_publicar()`). Toda operación es pura y devuelve una lista nueva. El `id` de una fila sólo identifica la fila en el editor: la
// base no lo recibe (reemplaza todas las filas), así que una fila nueva lleva el que le dé quien llama.
import { z } from 'zod'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { MENSAJE_DEL_TOPE, TOPE_DE_FILAS } from './validacion'

// Lo que puede traer una celda de la base: un número, un texto o nulo, y un booleano que sólo entra por SQL (se conserva y la base lo rechaza al publicar, con su
// mensaje y su celda). Una celda que es un objeto o una lista no se edita: la lectura falla.
export const esquemaDeValorDeCelda = z.union([z.number(), z.string(), z.boolean(), z.null()])
export type ValorDeCelda = z.infer<typeof esquemaDeValorDeCelda>
export type ValoresDeFila = Readonly<Record<string, ValorDeCelda | undefined>>
export type FilaEditable = { id: string; valores: ValoresDeFila }

const acotar = (n: number, max: number) => Math.min(Math.max(Math.trunc(n), 0), max)

// Sin las celdas nulas o ausentes: la base las guarda así (`jsonb_strip_nulls`) y así compara «La tabla no cambió.».
const sinNulos = (valores: ValoresDeFila): Record<string, number | string | boolean> => {
  const limpios: Record<string, number | string | boolean> = {}
  for (const [clave, valor] of Object.entries(valores)) {
    if (valor !== null && valor !== undefined) limpios[clave] = valor
  }
  return limpios
}

// `null` quita la celda; otro valor la pisa. Un id que no está deja la lista como estaba.
export function editarCelda(
  filas: readonly FilaEditable[],
  id: string,
  clave: string,
  valor: ValorDeCelda,
): FilaEditable[] {
  return filas.map((f) =>
    f.id === id ? { id: f.id, valores: sinNulos({ ...f.valores, [clave]: valor }) } : f,
  )
}

// Una fila vacía en `indice` (acotado a la lista); con la tabla llena, el tope.
export function sumarFila(
  filas: readonly FilaEditable[],
  indice: number,
  id: string,
): Resultado<FilaEditable[]> {
  if (filas.length >= TOPE_DE_FILAS) return fallo('regla', MENSAJE_DEL_TOPE)
  const lugar = acotar(indice, filas.length)
  return ok([...filas.slice(0, lugar), { id, valores: {} }, ...filas.slice(lugar)])
}

export function quitarFila(filas: readonly FilaEditable[], id: string): FilaEditable[] {
  return filas.filter((f) => f.id !== id)
}

// Deja la fila en el índice `destino` (acotado). Un id que no está deja el mismo orden.
export function moverFila(
  filas: readonly FilaEditable[],
  id: string,
  destino: number,
): FilaEditable[] {
  const desde = filas.findIndex((f) => f.id === id)
  const movida = filas[desde]
  if (!movida) return [...filas]
  const resto = filas.filter((_, i) => i !== desde)
  const lugar = acotar(destino, resto.length)
  return [...resto.slice(0, lugar), movida, ...resto.slice(lugar)]
}

// Lo que se publica: los valores de cada fila, en su orden, sin el id ni las celdas nulas.
export function filasParaPublicar(
  filas: readonly FilaEditable[],
): Record<string, number | string | boolean>[] {
  return filas.map((f) => sinNulos(f.valores))
}
