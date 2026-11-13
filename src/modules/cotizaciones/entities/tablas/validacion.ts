// Las filas de una tabla de referencia contra sus columnas (4.23-2): el espejo de `_tabla_referencia_filas_validas()`,
// con los mismos mensajes y el mismo camino (el `hint` de la base). La regla de verdad es la de la base: esto deja
// decir el motivo al lado de la celda antes de publicar. Tres detalles se copian al pie de la letra: el largo de un texto en puntos de código (`char_length`), las
// claves de una fila en orden de punto de código (`collate "C"`) y la etiqueta recortada sólo de espacios (`btrim`).
import { z } from 'zod'
import type { ColumnaDeTabla } from '../tabla-de-ayuda'

export const TOPE_DE_FILAS = 2000
export const MENSAJE_DEL_TOPE = 'Una tabla tiene hasta 2.000 filas.'
const LARGO_MAXIMO_DE_TEXTO = 200

export type ErrorDeFilas = { mensaje: string; camino: string }

const esObjeto = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x)

// `tablas_referencia.columnas` tal cual viene de la base: una lista de objetos con `clave` de texto; `etiqueta` y `tipo` que faltan (o no son texto) quedan vacíos.
// Otra forma no es una tabla que se pueda editar: nulo.
export function columnasDesde(crudo: unknown): ColumnaDeTabla[] | null {
  if (!Array.isArray(crudo)) return null
  const columnas: ColumnaDeTabla[] = []
  for (const c of crudo) {
    if (!esObjeto(c) || typeof c['clave'] !== 'string') return null
    const { clave, etiqueta, tipo } = c
    columnas.push({
      clave,
      etiqueta: typeof etiqueta === 'string' ? etiqueta : '',
      tipo: typeof tipo === 'string' ? tipo : '',
    })
  }
  return columnas
}

// El orden de `collate "C"`: por punto de código. El `<` de JS compara unidades UTF-16 y difiere fuera del BMP; `localeCompare`, en todo.
function compararPorPuntoDeCodigo(a: string, b: string): number {
  const x = [...a]
  const y = [...b]
  for (let i = 0; i < Math.min(x.length, y.length); i += 1) {
    const d = (x[i]?.codePointAt(0) ?? 0) - (y[i]?.codePointAt(0) ?? 0)
    if (d !== 0) return d
  }
  return x.length - y.length
}

// Un texto que la base guarda: sin `\u0000` ni surrogates sueltos (no pasan a jsonb) y de hasta 200 puntos de código.
const textoValido = (s: string) =>
  s.isWellFormed() && !s.includes('\u0000') && [...s].length <= LARGO_MAXIMO_DE_TEXTO

function celdaValida(tipo: string, valor: unknown): boolean {
  if (valor === null || valor === undefined) return true
  if (typeof valor === 'number') {
    return (
      tipo !== 'texto' && Number.isFinite(valor) && (tipo !== 'anio' || Number.isInteger(valor))
    )
  }
  if (typeof valor === 'string') {
    return tipo !== 'numero' && tipo !== 'anio' && textoValido(valor)
  }
  return false
}

function motivoDelTipo(tipo: string): string {
  switch (tipo) {
    case 'numero':
      return 'va con un número'
    case 'anio':
      return 'va con un año'
    case 'texto':
      return 'va con un texto de hasta 200 letras'
    default:
      return 'va con un número o un texto de hasta 200 letras'
  }
}

// `coalesce(nullif(btrim(etiqueta), ''), clave)`: `btrim` sin segundo argumento sólo quita espacios (U+0020).
const etiquetaDe = (columna: ColumnaDeTabla) =>
  columna.etiqueta.replace(/^ +| +$/g, '') || columna.clave

// El motivo de una celda que no vale («Monto» va con un número, sin punto), o nulo. Una celda nula o ausente vale siempre. El editor lo usa por celda.
export function motivoDeCelda(columna: ColumnaDeTabla, valor: unknown): string | null {
  return celdaValida(columna.tipo, valor)
    ? null
    : `«${etiquetaDe(columna)}» ${motivoDelTipo(columna.tipo)}`
}

const columnaDe = (columnas: readonly ColumnaDeTabla[], clave: string) =>
  columnas.find((c) => c.clave === clave)

function errorDeUnaFila(
  columnas: readonly ColumnaDeTabla[],
  fila: unknown,
  n: number,
): ErrorDeFilas | null {
  const camino = `filas.${String(n - 1)}`
  if (!esObjeto(fila)) {
    return { mensaje: `La fila ${String(n)}: no es una fila de la tabla.`, camino }
  }
  for (const clave of Object.keys(fila).sort(compararPorPuntoDeCodigo)) {
    const columna = columnaDe(columnas, clave)
    if (!columna) {
      return {
        mensaje: `La fila ${String(n)}: la tabla no tiene la columna «${clave}».`,
        camino: `${camino}.${clave}`,
      }
    }
    const motivo = motivoDeCelda(columna, fila[clave])
    if (motivo !== null) {
      return { mensaje: `La fila ${String(n)}: ${motivo}.`, camino: `${camino}.${clave}` }
    }
  }
  return null
}

// El primer error de las filas, en el orden de la base (la lista, el tope y, fila por fila, cada clave), o nulo si todas valen.
export function validarFilas(
  columnas: readonly ColumnaDeTabla[],
  filas: unknown,
): ErrorDeFilas | null {
  if (!Array.isArray(filas)) {
    return { mensaje: 'Las filas de la tabla van en una lista.', camino: 'filas' }
  }
  if (filas.length > TOPE_DE_FILAS) {
    return { mensaje: MENSAJE_DEL_TOPE, camino: 'filas' }
  }
  for (const [i, fila] of (filas as unknown[]).entries()) {
    const error = errorDeUnaFila(columnas, fila, i + 1)
    if (error) return error
  }
  return null
}

// El Zod de una fila para el formulario del editor: un issue por clave ajena y por celda que no vale, con la clave como camino.
export function esquemaDeFilaDeTabla(columnas: readonly ColumnaDeTabla[]) {
  return z.record(z.string(), z.unknown()).superRefine((fila, ctx) => {
    for (const clave of Object.keys(fila).sort(compararPorPuntoDeCodigo)) {
      const columna = columnaDe(columnas, clave)
      const motivo = columna ? motivoDeCelda(columna, fila[clave]) : null
      const mensaje = columna ? motivo && `${motivo}.` : `La tabla no tiene la columna «${clave}».`
      if (mensaje) {
        ctx.addIssue({ code: 'custom', message: mensaje, path: [clave] })
      }
    }
  })
}
