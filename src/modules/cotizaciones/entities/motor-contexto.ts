// El estado de una evaluación y lo que comparten los archivos del motor: los faltantes, con su código estable (el
// contrato con `evaluar_formula()` del 4.06), la lectura de un nodo anterior y cómo se asienta un valor.
import type { FilaDeTabla, Formula } from './formula'
import { buscar, mapaDe, recorrer, type Medidor } from './medidor'
import { mapasDe, type Entrada, type MapasDeEntrada } from './motor-entrada'
import { ErrorDelMotor } from './motor-errores'
import type { Nodo } from './nodos'

// Por qué un nodo quedó sin valor (docs/COTIZADOR.md › «El motor» › «Qué pasa cuando falta algo»).
export const CODIGOS_DE_FALTANTE = [
  'campo_sin_valor',
  'tabla_sin_filas',
  'fila_sin_coincidencia',
  'celda_sin_valor',
  'division_por_cero',
  'tipo_de_cambio_sin_valor',
  'fuera_de_rango',
] as const

export type CodigoDeFaltante = (typeof CODIGOS_DE_FALTANTE)[number]
// `donde` es el nodo (o el grupo, o `total`) donde nace el null; `ref`, la tabla, el campo o la clave que faltó.
export type Faltante = { codigo: CodigoDeFaltante; donde: string; ref?: string }
// El valor de un nodo: null cuando falta algo que lo alcanza.
export type Valor = number | null

export type Evaluacion = {
  formula: Formula
  entrada: MapasDeEntrada
  // Toda la fórmula, por id: un `match` que no nombra un nodo nombra un campo del vehículo.
  nodos: ReadonlyMap<string, Nodo>
  // El nodo `salida: total`.
  total: Nodo
  constantes: ReadonlyMap<string, number>
  congeladas: ReadonlyMap<string, readonly FilaDeTabla[]>
  // Lo ya evaluado, en el orden de la lista: sólo se lee hacia atrás.
  valores: Map<string, Valor>
  // El USD de cada grupo mientras se suma, en el orden de la lista.
  subtotales: Map<string, Valor>
  // Uno por cada null que nace, en el orden en que nace.
  faltantes: Faltante[]
  m: Medidor
}

export const sinValidar = (detalle: string, donde?: string) =>
  new ErrorDelMotor(
    'formula_sin_validar',
    `La fórmula no pasó por validarFormula: ${detalle}.`,
    donde,
  )

export function prepararEvaluacion(formula: Formula, entrada: Entrada, m: Medidor): Evaluacion {
  const nodos = new Map<string, Nodo>()
  let total: Nodo | undefined
  for (const n of recorrer(formula.definicion.nodos, m)) {
    nodos.set(n.id, n)
    if (n.salida === 'total') total ??= n
  }
  if (total === undefined) throw sinValidar('no tiene un nodo con salida «total»')
  return {
    formula,
    entrada: mapasDe(entrada, m),
    nodos,
    total,
    constantes: mapaDe(formula.params.constantes, m),
    congeladas: mapaDe(formula.params.tablas, m),
    valores: new Map(),
    subtotales: new Map(),
    faltantes: [],
    m,
  }
}

// Anota por qué un valor quedó null, y lo devuelve.
export function anotar(
  ev: Evaluacion,
  codigo: CodigoDeFaltante,
  donde: string,
  ref?: string,
): null {
  ev.faltantes.push(ref === undefined ? { codigo, donde } : { codigo, donde, ref })
  return null
}

// El valor de un nodo anterior. Si no está, la fórmula no pasó por validarFormula.
export function leer(ev: Evaluacion, id: string, quien: string): Valor {
  const v = buscar(ev.valores, id, ev.m)
  if (v === undefined)
    throw sinValidar(`«${quien}» lee «${id}», que no está antes en la lista`, quien)
  return v
}

// Todo valor que se guarda pasa por acá: −0 vale 0 (JSON y jsonb no lo distinguen) y lo que no es finito queda
// null con `fuera_de_rango` (JSON no lo puede guardar).
export function asentar(ev: Evaluacion, x: Valor, donde: string): Valor {
  if (x === null) return null
  if (!Number.isFinite(x)) return anotar(ev, 'fuera_de_rango', donde)
  return x === 0 ? 0 : x
}
