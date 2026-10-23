import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Formula } from './formula'
import { evaluar } from './motor'
import type { Entrada } from './motor-entrada'
import { referenciasDe, soloEnDe } from './nodos'
import { validarFormula } from './validar'

const FILAS = 50

type Sintetica = { formula: Formula; entrada: Entrada }
type Crudo = Record<string, unknown>

const opcion = (clave: string) => ({ clave, etiqueta: clave, titulo: clave })
// Lo fijo: la variante (a o b, por defecto a), dos tipos de cambio, la bandera, el año y el porcentaje.
const CABECERA: Crudo[] = [
  {
    id: 'variante',
    tipo: 'opcion',
    etiqueta: 'V',
    opciones: [opcion('a'), opcion('b')],
    por_defecto: 'a',
  },
  { id: 'tc_a', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'A', formato: 'raw' },
  { id: 'tc_b', tipo: 'tipo_cambio', clave: 'paralelo', etiqueta: 'B', formato: 'raw' },
  { id: 'activa', tipo: 'bandera', etiqueta: 'Activa', formato: 'raw' },
  { id: 'anio', tipo: 'campo_vehiculo', campo: 'anio', etiqueta: 'Año', formato: 'raw' },
  { id: 'pct', tipo: 'constante', etiqueta: 'P', formato: 'pct' },
]

// El nodo k, en un ciclo de 8 tipos: miembros (constantes, inputs, `porcentaje_de`, tablas y tramos) y cálculos
// fuera de los grupos (uno de cada dos `multiplicar` con una condición encendida). Cada rasgo va en un tipo del
// ciclo, así las dos sintéticas lo tienen en la misma proporción: el `multiplicar` está en su variante y el
// `restar`, fuera; el input sin tipear vale su sugerido; el tramo trae override y el `redondear`, uno que se
// descarta.
function forma(k: number, ids: readonly string[], grupo: string): Crudo {
  const [a, b, c] = [ids[k - 1] ?? 'pct', ids[k - 2] ?? 'pct', ids[k - 3] ?? 'pct']
  const condicion = k % 16 === 3 ? { condicion: 'activa' } : {}
  const formas: Crudo[] = [
    { tipo: 'constante', grupo },
    { tipo: 'input', sugerido_de: 'pct', grupo },
    { tipo: 'calculo', op: 'porcentaje_de', de: [a, b], pct: 'pct', grupo },
    { tipo: 'calculo', op: 'multiplicar', de: [a, b], solo_en: ['a'], ...condicion },
    { tipo: 'tabla', tabla: 't1', match: { clase: 'clase' }, columna: 'v', grupo },
    { tipo: 'tramo', tabla: 't2', sobre: 'anio', columna: 'v', sobrescribible: true, grupo },
    { tipo: 'calculo', op: 'restar', de: [a, b, c], solo_en: ['b'] },
    { tipo: 'calculo', op: 'redondear', de: [a], n: 2 },
  ]
  return { id: `x${k}`, etiqueta: `x${k}`, ...formas[k % 8] }
}

const tablas = () => ({
  t1: Array.from({ length: FILAS }, (_, i) => ({ clase: `c${i}`, v: i })),
  t2: Array.from({ length: FILAS }, (_, i) => ({ desde: 2000 + i, hasta: 2000 + i, v: i })),
})

// Una fórmula sintética de unos `n` nodos en n/10 grupos, con un total que suma la mitad. Las dos tablas,
// congeladas, tienen 50 filas.
function sintetica(n: number): Sintetica {
  const grupos = Array.from({ length: n / 10 }, (_, i) => ({
    id: `g${i}`,
    etiqueta: `G${i}`,
    tono: 't',
    bucket: `b${i % 2}`,
  }))
  const nodos = [...CABECERA]
  const params: Crudo = { pct: 0.1 }
  const overrides: Record<string, number> = { zz: 1, mm: 2, aa: 3 }
  const ids: string[] = []
  for (let k = 0, miembro = 0; nodos.length < n - 1; k += 1) {
    const nodo = forma(k, ids, `g${miembro % grupos.length}`)
    if (nodo['grupo'] !== undefined) miembro += 1
    nodos.push(nodo)
    if (k % 8 === 0) params[`x${k}`] = k
    if (k % 8 === 5 || k % 8 === 7) overrides[`x${k}`] = k
    ids.push(`x${k}`)
  }
  const de = ids.filter((_, i) => i % 2 === 0)
  nodos.push({ id: 'total', tipo: 'calculo', op: 'suma', de, etiqueta: 'T', salida: 'total' })
  params['tablas'] = tablas()
  const definicion = { nodos, buckets: { b0: 'tc_a', b1: 'tc_b' }, total_en: 'tc_b', grupos }
  const r = validarFormula(definicion, params)
  if (!r.ok) throw new Error(r.error.mensaje)
  const entrada = {
    inputs: {},
    overrides,
    banderas: { activa: true },
    tipos_cambio: { oficial: 6.96, paralelo: 10 },
    vehiculo: { anio: 2049, clase: `c${FILAS - 1}` },
    tablas: {},
  }
  return { formula: r.formula, entrada }
}

// Lo que mide una corrida: nodos, aristas, grupos, las claves de la entrada (con los overrides) y de params, las
// entradas de `solo_en`
// y las opciones de la variante, y en cada búsqueda las filas de su tabla por (1 + las columnas que compara: las del
// `match`, o `desde` y `hasta`).
function tamano({ formula, entrada }: Sintetica): number {
  const nodos = formula.definicion.nodos
  const filas = (t: string) => formula.params.tablas[t]?.length ?? 0
  let total = nodos.length + (formula.definicion.grupos?.length ?? 0)
  for (const n of nodos) {
    total += referenciasDe(n).length + (soloEnDe(n)?.length ?? 0)
    if (n.tipo === 'opcion') total += n.opciones.length
    if (n.tipo === 'tabla') total += filas(n.tabla) * (1 + Object.keys(n.match).length)
    if (n.tipo === 'tramo') total += filas(n.tabla) * 3
  }
  const claves = (o: object) => Object.keys(o).length
  total += claves(entrada.inputs) + claves(entrada.banderas) + claves(entrada.tipos_cambio)
  total += claves(entrada.overrides)
  total +=
    claves(entrada.vehiculo) + claves(formula.params.constantes) + claves(formula.params.tablas)
  return total
}

function visitas(s: Sintetica): number {
  const medidor = { visitas: 0 }
  evaluar(s.formula, s.entrada, undefined, medidor)
  return medidor.visitas
}

// k contada por pasadas (no medida). La unidad que más cuesta es un nodo `tabla` sobrescribible de un grupo, con su
// condición y su tabla viva: armar el índice (1), la pasada de los estados y su condición (2), la pasada (1), su
// estado (1), su override y si es un pct pisado (2), la salida de valores, de estados y de fuentes (3), la tabla
// congelada y la viva (2), la celda (1) y su grupo (1) = 14. Una arista cuesta a lo sumo 3 (un `match`: el recorrido,
// si es un nodo y su valor), un grupo 7 (el modo, si se dibuja y el total), una clave de la entrada 3, una entrada de
// `solo_en` o una opción 1 y una celda comparada 2.
const K = 14

describe('evaluar con volumen', () => {
  const chica = sintetica(200)
  const grande = sintetica(2000)

  it('evalúa las dos sintéticas, de 200 y de 2.000 nodos, sin faltantes', () => {
    expect(chica.formula.definicion.nodos).toHaveLength(200)
    expect(grande.formula.definicion.nodos).toHaveLength(2000)
    expect(evaluar(chica.formula, chica.entrada).faltantes).toEqual([])
    expect(evaluar(grande.formula, grande.entrada).faltantes).toEqual([])
  })

  it('visita a lo sumo k veces el tamaño de la corrida: es lineal', () => {
    expect(visitas(chica)).toBeLessThanOrEqual(K * tamano(chica))
    expect(visitas(grande)).toBeLessThanOrEqual(K * tamano(grande))
  })

  it('diez veces más nodos son a lo sumo 10,5 veces más visitas, no cien', () => {
    expect(visitas(grande)).toBeLessThanOrEqual(10.5 * visitas(chica))
  })

  it('el motor no recorre una lista sin el medidor: ni métodos que iteran, ni while, y todo for es por recorrer', () => {
    const archivos = [
      'motor.ts',
      'motor-contexto.ts',
      'motor-entrada.ts',
      'motor-errores.ts',
      'motor-estados.ts',
      'motor-nodos.ts',
      'motor-sobrescribir.ts',
      'motor-calculo.ts',
      'motor-tablas.ts',
      'motor-totales.ts',
      'redondeo.ts',
    ]
    for (const a of archivos) {
      const fuente = readFileSync(new URL(a, import.meta.url), 'utf8')
      expect(fuente, a).not.toMatch(
        /\.(includes|indexOf|lastIndexOf|find|findIndex|findLast|filter|some|every|map|flatMap|reduce|forEach)\(/,
      )
      expect(fuente, a).not.toMatch(/\bwhile\s*\(/)
      for (const linea of fuente.split('\n').filter((l) => /\bfor\s*\(/.test(l))) {
        expect(linea, a).toContain('recorrer(')
      }
    }
  })
})
