import { describe, expect, it } from 'vitest'
import type { Definicion } from '../formula'
import { filasDe, idAuxiliarDe } from './filas'
import {
  CINCO_FILAS,
  NODOS_DE_BASE,
  formulaCruda,
  formulaDePrueba,
  idsDe,
  sinTextoEn,
} from './fila-de-prueba.soporte'

const ids = (d: Definicion) => filasDe(d).map((f) => f.nodo.id)

describe('filasDe (T1)', () => {
  it('da las filas en el orden de la lista, cada una con su índice, sus auxiliares y su texto', () => {
    const f = formulaDePrueba(CINCO_FILAS)
    const filas = filasDe(f.definicion)
    const propias = [
      'remate',
      'fees',
      'flete',
      'tc',
      'b',
      'c',
      'base',
      'total',
      'otra',
      'cuatro',
      'ultima',
    ]
    expect(filas.map((x) => [x.indice, x.nodo.id])).toEqual(propias.map((id, i) => [i, id]))
    const aux = Object.fromEntries(filas.map((x) => [x.nodo.id, x.auxiliares]))
    expect(aux['total']).toEqual(['total__1', 'total__2'])
    expect(aux['otra']).toEqual(['otra__1'])
    for (const id of ['base', 'cuatro', 'ultima', 'remate']) expect(aux[id], id).toEqual([])
    expect(filas.find((x) => x.nodo.id === 'total')?.texto).toBe('=(remate+fees)*4%')
    expect(filas.find((x) => x.nodo.id === 'remate')?.texto).toBeUndefined()
    // Las auxiliares no son filas.
    expect(idsDe(f)).toContain('total__1')
    expect(propias).not.toContain('total__1')
  })

  it('con un id de 41 caracteres, las auxiliares llevan el prefijo recortado (compiladas de verdad)', () => {
    const id = 'a'.repeat(41)
    const f = formulaDePrueba([{ id, texto: '=(remate+fees)*4%' }])
    expect(filasDe(f.definicion).find((x) => x.nodo.id === id)?.auxiliares).toEqual([
      `${'a'.repeat(38)}__1`,
      `${'a'.repeat(38)}__2`,
    ])
    expect(idAuxiliarDe(id, 1)).toBe(`${'a'.repeat(38)}__1`)
  })

  it('con 10 números, __10 recorta uno más', () => {
    const id = 'a'.repeat(41)
    const f = formulaDePrueba([{ id, texto: '=1+2+3+4+5+6+7+8+9+10' }])
    const esperadas = Array.from({ length: 10 }, (_, i) => {
      const s = `__${String(i + 1)}`
      return 'a'.repeat(41 - s.length) + s
    })
    expect(filasDe(f.definicion).find((x) => x.nodo.id === id)?.auxiliares).toEqual(esperadas)
    expect(ids(f.definicion)).toEqual([...NODOS_DE_BASE.map((n) => n.id), id])
  })

  it('un total__1 no contiguo con su fila no es auxiliar', () => {
    const f = formulaDePrueba([{ id: 'total', texto: '=(remate+fees)*4%' }])
    const n = f.definicion.nodos
    const sinContiguidad = [
      ...n.slice(0, -1),
      { id: 'intruso', tipo: 'input', etiqueta: 'X' },
      n[n.length - 1],
    ]
    const d = formulaCruda(sinContiguidad).definicion
    expect(ids(d)).toContain('total__1')
    expect(filasDe(d).find((x) => x.nodo.id === 'total')?.auxiliares).toEqual([])
  })

  it('una fila sin texto no tiene auxiliares aunque su cadena esté entera', () => {
    const f = formulaDePrueba([{ id: 'total', texto: '=(remate+fees)*4%' }])
    const sinTexto = f.definicion.nodos.map((n) => {
      if (n.id !== 'total') return n
      const { texto: _t, ...resto } = n as typeof n & { texto?: string }
      return resto
    })
    const d = formulaCruda(sinTexto).definicion
    expect(ids(d)).toEqual(expect.arrayContaining(['total__1', 'total__2', 'total']))
    expect(filasDe(d).find((x) => x.nodo.id === 'total')?.auxiliares).toEqual([])
  })
})

describe('filasDe: lo que parece una auxiliar y no lo es (T1)', () => {
  it('una fila propia total__1 justo antes de un total que no la nombra es una fila propia', () => {
    const d = formulaCruda([
      ...NODOS_DE_BASE,
      { id: 'total__1', tipo: 'constante', etiqueta: 'Propia' },
      {
        id: 'total',
        tipo: 'calculo',
        op: 'suma',
        de: ['remate', 'fees'],
        etiqueta: 'T',
        texto: '=remate+fees',
      },
    ]).definicion
    expect(ids(d)).toContain('total__1')
    expect(filasDe(d).find((x) => x.nodo.id === 'total')?.auxiliares).toEqual([])
  })

  it('un nodo con otro prefijo justo antes de total (foo__1) no es su auxiliar aunque total lo lea', () => {
    const d = formulaCruda([
      ...NODOS_DE_BASE,
      { id: 'foo__1', tipo: 'constante', etiqueta: 'Ajena' },
      {
        id: 'total',
        tipo: 'calculo',
        op: 'suma',
        de: ['foo__1', 'remate'],
        etiqueta: 'T',
        texto: '=remate+fees',
      },
    ]).definicion
    expect(ids(d)).toContain('foo__1')
    expect(filasDe(d).find((x) => x.nodo.id === 'total')?.auxiliares).toEqual([])
  })
})

describe('filasDe: lo que la cadena exige (T1)', () => {
  it('un nodo con su propio texto no es una auxiliar (una auxiliar nunca lleva texto)', () => {
    const d = formulaCruda([
      ...NODOS_DE_BASE,
      { id: 'total__1', tipo: 'constante', etiqueta: 'Con texto', texto: '=4' },
      {
        id: 'total',
        tipo: 'calculo',
        op: 'suma',
        de: ['total__1', 'remate'],
        etiqueta: 'T',
        texto: '=remate+fees',
      },
    ]).definicion
    expect(ids(d)).toContain('total__1')
    expect(filasDe(d).find((x) => x.nodo.id === 'total')?.auxiliares).toEqual([])
  })

  it('una fila propia total__1 que el texto de total nombra es una fila propia', () => {
    // `total__1` sin texto, como una fila sembrada: sólo el texto de `total` dice que no es suya.
    const f = sinTextoEn(
      formulaDePrueba([
        { id: 'total__1', texto: '=4' },
        { id: 'total', texto: '=total__1+remate' },
      ]),
      'total__1',
    )
    expect(ids(f.definicion)).toContain('total__1')
    expect(filasDe(f.definicion).find((x) => x.nodo.id === 'total')?.auxiliares).toEqual([])
  })

  it('una cadena donde dos nodos nombran a la misma auxiliar no da auxiliares', () => {
    const d = formulaCruda([
      ...NODOS_DE_BASE,
      { id: 'total__1', tipo: 'constante', etiqueta: 'A' },
      { id: 'total__2', tipo: 'calculo', op: 'suma', de: ['total__1', 'remate'], etiqueta: 'B' },
      {
        id: 'total',
        tipo: 'calculo',
        op: 'multiplicar',
        de: ['total__1', 'total__2'],
        etiqueta: 'T',
        texto: '=(remate+fees)*4%',
      },
    ]).definicion
    expect(filasDe(d).find((x) => x.nodo.id === 'total')?.auxiliares).toEqual([])
    expect(ids(d)).toEqual(expect.arrayContaining(['total__1', 'total__2']))
  })

  it('no lanza con una definición vacía', () => {
    expect(filasDe({ nodos: [] })).toEqual([])
  })
})
