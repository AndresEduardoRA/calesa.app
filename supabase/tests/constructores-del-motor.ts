// Los constructores de los casos escritos a mano del corpus de `evaluar_formula()` (`casos-de-borde.ts`, `casos-sin-validar.ts`,
// `casos-de-texto.ts` y `casos-de-forma.ts`): nodos, fórmulas y entradas con lo mínimo que pide cada forma del Zod.
import type { Json, Objeto } from './mutadores-de-formula'

export type CasoAMano = {
  nombre: string
  grupo: 'borde' | 'sin_validar' | 'texto' | 'forma'
  definicion: Json
  params: Json
  entrada: Json
  modo?: Json
  // Si está, estos textos JSON reemplazan a los valores de arriba: la base los recibe tal cual (`::jsonb`), TS los lee con JSON.parse.
  texto?: { definicion?: string; params?: string; entrada?: string; modo?: string }
}

export type Formula = { definicion: Json; params: Json }

export const tc = (id: string, clave = 'oficial'): Objeto => ({
  id,
  tipo: 'tipo_cambio',
  clave,
  etiqueta: id,
  formato: 'raw',
})
export const inp = (id: string, extra: Objeto = {}): Objeto => ({
  id,
  tipo: 'input',
  etiqueta: id,
  ...extra,
})
export const con = (id: string, extra: Objeto = {}): Objeto => ({
  id,
  tipo: 'constante',
  etiqueta: id,
  ...extra,
})
export const bandera = (id: string, extra: Objeto = {}): Objeto => ({
  id,
  tipo: 'bandera',
  etiqueta: id,
  ...extra,
})
export const campo = (id: string, nombre: string, extra: Objeto = {}): Objeto => ({
  id,
  tipo: 'campo_vehiculo',
  campo: nombre,
  etiqueta: id,
  formato: 'raw',
  ...extra,
})
export const calc = (id: string, op: string, de: string[], extra: Objeto = {}): Objeto => ({
  id,
  tipo: 'calculo',
  op,
  de,
  etiqueta: id,
  ...extra,
})
export const total = (de: string[], extra: Objeto = {}) =>
  calc('total', 'suma', de, { salida: 'total', ...extra })
export const opcion = (id: string, extra: Objeto = {}): Objeto => ({
  id,
  tipo: 'opcion',
  etiqueta: id,
  opciones: [
    { clave: 'a', etiqueta: 'A', titulo: 'A' },
    { clave: 'b', etiqueta: 'B', titulo: 'B' },
  ],
  por_defecto: 'a',
  ...extra,
})
export const tabla = (id: string, nombre: string, match: Objeto, extra: Objeto = {}): Objeto => ({
  id,
  tipo: 'tabla',
  tabla: nombre,
  match,
  columna: 'v',
  etiqueta: id,
  ...extra,
})
export const tramo = (id: string, nombre: string, sobre: string, extra: Objeto = {}): Objeto => ({
  id,
  tipo: 'tramo',
  tabla: nombre,
  sobre,
  columna: 'v',
  etiqueta: id,
  ...extra,
})

export const entrada = (x: Objeto = {}): Objeto => ({
  inputs: {},
  banderas: {},
  tipos_cambio: { oficial: 1 },
  vehiculo: {},
  tablas: {},
  overrides: {},
  ...x,
})

// La fórmula más corriente: un tipo de cambio `tc` en el bucket `x`, nodos y un total con su bucket.
export const formula = (nodos: Objeto[], extra: Objeto = {}, params: Objeto = {}): Formula => ({
  definicion: { nodos, buckets: { x: 'tc' }, ...extra },
  params,
})

// `base()` es lo mínimo que evalúa: tc, un input `x` y el total (suma de `x`) en el bucket `x`.
export const base = (extra: Objeto[] = [], c: Objeto = {}, params: Objeto = {}): Formula =>
  formula([tc('tc'), inp('x'), ...extra, total(['x'], { bucket: 'x', ...c })], {}, params)

export const caso = (
  grupo: CasoAMano['grupo'],
  nombre: string,
  f: Formula,
  e: Json,
): CasoAMano => ({ nombre, grupo, ...f, entrada: e })
