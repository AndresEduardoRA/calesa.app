// Fórmulas mínimas para probar las filas con texto (4.21-1) y el ⚙ simulado. Sólo para las pruebas: compila cada texto con
// `compilarExpresion()` en su lugar y arma la fórmula como la guardará el editor (`{ ...raíz compilada, texto }`).
import { compilarExpresion, type DestinoDeCompilacion } from '../compilador'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import { validarFormula } from '../validar'

export type FilaDePrueba = {
  id: string
  texto: string
  etiqueta?: string
  // Lo que la fila lleva además (seccion, color, sobrescribible, condicion…), pegado a la raíz compilada.
  extra?: Record<string, unknown>
  // Lo que va por el destino (formato, descripcion, grupo…).
  destino?: Partial<DestinoDeCompilacion>
}

export const NODOS_DE_BASE: Nodo[] = [
  { id: 'remate', tipo: 'input', etiqueta: 'Remate', formato: 'usd' },
  { id: 'fees', tipo: 'input', etiqueta: 'Fees', formato: 'usd' },
  { id: 'flete', tipo: 'input', etiqueta: 'Flete', formato: 'usd' },
  { id: 'tc', tipo: 'tipo_cambio', etiqueta: 'Tipo de cambio', clave: 'oficial' },
  { id: 'b', tipo: 'bandera', etiqueta: 'Bandera B' },
  { id: 'c', tipo: 'bandera', etiqueta: 'Bandera C' },
]

// Arma la fórmula validada de las filas, en su orden (la última da el total si ninguna lo dice). Lanza si algo no compila o no valida: es un error de la prueba.
export function formulaDePrueba(filas: readonly FilaDePrueba[], base = NODOS_DE_BASE): Formula {
  const nodos: Nodo[] = [...base]
  const params: Record<string, number> = {}
  const hayTotal = filas.some((f) => f.destino?.salida === 'total')
  for (const [i, f] of filas.entries()) {
    const salida = !hayTotal && i === filas.length - 1 ? { salida: 'total' as const } : {}
    const r = compilarExpresion(f.texto, {
      nodos,
      grupos: [],
      params,
      destino: { id: f.id, etiqueta: f.etiqueta ?? f.id, ...salida, ...f.destino },
    })
    if (!r.ok) throw new Error(`${f.id}: ${r.error.codigo} ${r.error.mensaje}`)
    const compilados = r.nodos.map((n) =>
      n.id === f.id ? ({ ...n, texto: f.texto, ...f.extra, bucket: 'b' } as Nodo) : n,
    )
    nodos.push(...compilados)
    Object.assign(params, r.params)
  }
  const v = validarFormula({ nodos, buckets: { b: 'tc' } }, params)
  if (!v.ok) throw new Error(`la fórmula de prueba no valida: ${v.error.mensaje}`)
  return v.formula
}

// El ⚙ simulado: la constante publicada con otro valor, sin mirar el texto (como `formula_cambiar_constante()`).
export function conElAjuste(formula: Formula, id: string, valor: number): Formula {
  return {
    ...formula,
    params: { ...formula.params, constantes: { ...formula.params.constantes, [id]: valor } },
  }
}

export const nodoDe = (formula: Formula, id: string): Nodo | undefined =>
  formula.definicion.nodos.find((n) => n.id === id)

export const idsDe = (formula: Formula): string[] => formula.definicion.nodos.map((n) => n.id)

// Una fórmula de cinco filas, con auxiliares en medio.
export const CINCO_FILAS: FilaDePrueba[] = [
  { id: 'base', texto: '=remate+fees' },
  { id: 'total', texto: '=(remate+fees)*4%' },
  { id: 'otra', texto: '=base*2' },
  { id: 'cuatro', texto: '=4' },
  { id: 'ultima', texto: '=total+otra' },
]

// ¿La fórmula (ya partida en constantes y tablas) valida? Para decir «las salidas pasan `validarFormula()`».
export function validaLaFormula(formula: Formula) {
  return validarFormula(formula.definicion, {
    ...formula.params.constantes,
    tablas: formula.params.tablas,
  })
}

// Una fórmula sin compilar ni validar, con filas que se escriben a mano (o `n` filas iguales para las pruebas de escala).
export function formulaCruda(
  nodos: readonly unknown[],
  constantes: Record<string, number> = {},
): Formula {
  return {
    definicion: { nodos: nodos as Nodo[], buckets: { b: 'tc' } },
    params: { constantes, tablas: {} },
  }
}

export function formulaDeNFilas(n: number): Formula {
  const filas = Array.from({ length: n }, (_, i) => ({
    id: `r${String(i + 1)}`,
    tipo: 'calculo',
    op: 'suma',
    de: ['remate', 'fees'],
    etiqueta: 'Fila',
    texto: '=remate+fees',
    ...(i === n - 1 ? { salida: 'total' } : {}),
  }))
  return formulaCruda([...NODOS_DE_BASE, ...filas])
}

// La misma fórmula con una fila sin su `texto` (como las sembradas).
export function sinTextoEn(formula: Formula, id: string): Formula {
  return {
    ...formula,
    definicion: {
      ...formula.definicion,
      nodos: formula.definicion.nodos.map((n) => {
        if (n.id !== id) return n
        const { texto: _texto, ...resto } = n as typeof n & { texto?: string }
        return resto as Nodo
      }),
    },
  }
}
