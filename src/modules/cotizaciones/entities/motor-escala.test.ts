import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Formula } from './formula'
import { evaluar } from './motor'
import type { Entrada } from './motor-entrada'
import { referenciasDe } from './nodos'
import { validarFormula } from './validar'

const FILAS = 50

// Una fórmula sintética de unos `n` nodos con todo lo que el motor recorre: miembros (constantes, inputs,
// `porcentaje_de`, tablas y tramos) en n/10 grupos, cálculos fuera de los grupos (uno de cada dos con una
// condición encendida) y un total que suma la mitad. Las dos tablas, congeladas, tienen 50 filas.
function sintetica(n: number): { formula: Formula; entrada: Entrada } {
  const grupos = Array.from({ length: n / 10 }, (_, i) => ({
    id: `g${i}`,
    etiqueta: `G${i}`,
    tono: 't',
    bucket: `b${i % 2}`,
  }))
  const nodos: Record<string, unknown>[] = [
    { id: 'tc_a', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'A', formato: 'raw' },
    { id: 'tc_b', tipo: 'tipo_cambio', clave: 'paralelo', etiqueta: 'B', formato: 'raw' },
    { id: 'activa', tipo: 'bandera', etiqueta: 'Activa', formato: 'raw' },
    { id: 'anio', tipo: 'campo_vehiculo', campo: 'anio', etiqueta: 'Año', formato: 'raw' },
    { id: 'pct', tipo: 'constante', etiqueta: 'P', formato: 'pct' },
  ]
  const params: Record<string, unknown> = { pct: 0.1 }
  const inputs: Record<string, number> = {}
  const ids: string[] = []
  for (let k = 0, miembro = 0; nodos.length < n - 1; k += 1) {
    const id = `x${k}`
    const [a, b, c] = [ids[k - 1] ?? 'pct', ids[k - 2] ?? 'pct', ids[k - 3] ?? 'pct']
    const grupo = `g${miembro % grupos.length}`
    const condicion = k % 16 === 3 ? { condicion: 'activa' } : {}
    const forma = [
      { tipo: 'constante', grupo },
      { tipo: 'input', grupo },
      { tipo: 'calculo', op: 'porcentaje_de', de: [a, b], pct: 'pct', grupo },
      { tipo: 'calculo', op: 'multiplicar', de: [a, b], ...condicion },
      { tipo: 'tabla', tabla: 't1', match: { clase: 'clase' }, columna: 'v', grupo },
      { tipo: 'tramo', tabla: 't2', sobre: 'anio', columna: 'v', grupo },
      { tipo: 'calculo', op: 'restar', de: [a, b, c] },
      { tipo: 'calculo', op: 'redondear', de: [a], n: 2 },
    ][k % 8]
    if (forma?.grupo !== undefined) miembro += 1
    nodos.push({ id, etiqueta: id, ...forma })
    if (k % 8 === 0) params[id] = k
    if (k % 8 === 1) inputs[id] = k
    ids.push(id)
  }
  nodos.push({
    id: 'total',
    tipo: 'calculo',
    op: 'suma',
    de: ids.filter((_, i) => i % 2 === 0),
    etiqueta: 'T',
    salida: 'total',
  })
  params['tablas'] = {
    t1: Array.from({ length: FILAS }, (_, i) => ({ clase: `c${i}`, v: i })),
    t2: Array.from({ length: FILAS }, (_, i) => ({ desde: 2000 + i, hasta: 2000 + i, v: i })),
  }
  const definicion = { nodos, buckets: { b0: 'tc_a', b1: 'tc_b' }, total_en: 'tc_b', grupos }
  const r = validarFormula(definicion, params)
  if (!r.ok) throw new Error(r.error.mensaje)
  const entrada = {
    inputs,
    banderas: { activa: true },
    tipos_cambio: { oficial: 6.96, paralelo: 10 },
    vehiculo: { anio: 2049, clase: `c${FILAS - 1}` },
    tablas: {},
  }
  return { formula: r.formula, entrada }
}

// Lo que mide una corrida: nodos, aristas, grupos, las claves de la entrada y de params, y en cada búsqueda las
// filas de su tabla por (1 + las columnas que compara: las del `match`, o `desde` y `hasta`).
function tamano({ formula, entrada }: ReturnType<typeof sintetica>): number {
  const nodos = formula.definicion.nodos
  const filas = (t: string) => formula.params.tablas[t]?.length ?? 0
  let total = nodos.length + (formula.definicion.grupos?.length ?? 0)
  for (const n of nodos) {
    total += referenciasDe(n).length
    if (n.tipo === 'tabla') total += filas(n.tabla) * (1 + Object.keys(n.match).length)
    if (n.tipo === 'tramo') total += filas(n.tabla) * 3
  }
  const claves = (o: object) => Object.keys(o).length
  total += claves(entrada.inputs) + claves(entrada.banderas) + claves(entrada.tipos_cambio)
  total +=
    claves(entrada.vehiculo) + claves(formula.params.constantes) + claves(formula.params.tablas)
  return total
}

function visitas(s: ReturnType<typeof sintetica>): number {
  const medidor = { visitas: 0 }
  evaluar(s.formula, s.entrada, undefined, medidor)
  return medidor.visitas
}

// k contada por pasadas (no medida). La unidad que más cuesta es un nodo `tabla` de un grupo, con su condición y
// su tabla viva: armar el índice, los rasgos, la pasada, la salida (4), la condición (1), la tabla congelada y la
// viva (2), la celda (1) y su grupo (1) = 9. Una arista cuesta a lo sumo 3 (un `match`: el recorrido, si es un
// nodo y su valor), un grupo 6 (el modo y el total), una clave de la entrada 3 y una celda comparada 2.
const K = 9

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
      'motor-nodos.ts',
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
