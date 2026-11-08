import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  auxiliaresDe,
  cadenasDeAuxiliares,
  idAuxiliarDe,
  nombresDelTexto,
} from './compilador-auxiliares'
import { compilarExpresion } from './compilador'
import type { Definicion } from './formula'
import type { Nodo } from './nodos'

const BASE: Nodo[] = [
  { id: 'remate', tipo: 'input', etiqueta: 'Remate', formato: 'usd' },
  { id: 'fees', tipo: 'input', etiqueta: 'Fees', formato: 'usd' },
]

// Compila cada texto en su lugar, como el editor (`{ ...raíz compilada, texto }`).
function definicion(filas: readonly { id: string; texto: string }[]): Definicion {
  const nodos: Nodo[] = [...BASE]
  for (const f of filas) {
    const r = compilarExpresion(f.texto, {
      nodos,
      grupos: [],
      params: {},
      destino: { id: f.id, etiqueta: f.id },
    })
    if (!r.ok) throw new Error(`${f.id}: ${r.error.codigo}`)
    nodos.push(...r.nodos.map((n) => (n.id === f.id ? ({ ...n, texto: f.texto } as Nodo) : n)))
  }
  return { nodos } as unknown as Definicion
}

const aux = (d: Definicion) => [...auxiliaresDe(d)].sort()
const con = (d: Definicion, nodos: unknown[]) => ({ ...d, nodos }) as unknown as Definicion

describe('auxiliaresDe (T1a)', () => {
  it('da las auxiliares que el compilador creó para el texto de cada fila', () => {
    expect(aux(definicion([{ id: 'total', texto: '=(remate+fees)*4%' }]))).toEqual([
      'total__1',
      'total__2',
    ])
    expect(aux(definicion([{ id: 'total', texto: '=remate*4%+100' }]))).toEqual([
      'total__1',
      'total__2',
      'total__3',
    ])
  })

  it('con el id largo, las auxiliares van con el prefijo recortado', () => {
    const id = 'a'.repeat(40)
    expect(aux(definicion([{ id, texto: '=remate*4%' }]))).toEqual([idAuxiliarDe(id, 1)])
    expect(idAuxiliarDe(id, 1)).toBe(`${'a'.repeat(38)}__1`)
  })

  it('sin texto en la raíz, no hay auxiliares', () => {
    const d = definicion([{ id: 'total', texto: '=remate*4%' }])
    const sinTexto = d.nodos.map((n) => (n.id === 'total' ? { ...n, texto: undefined } : n))
    expect(aux(con(d, sinTexto))).toEqual([])
  })

  it('(e) si el texto de la raíz nombra al nodo, es una fila que la raíz lee, no una auxiliar', () => {
    const d = definicion([
      { id: 'total__1', texto: '=4' },
      { id: 'total', texto: '=total__1+remate' },
    ])
    // `total__1` lleva texto: no es auxiliar por (c). Sin texto, sigue sin serlo por (e).
    expect(aux(d)).toEqual([])
    const sinTexto = d.nodos.map((n) => (n.id === 'total__1' ? { ...n, texto: undefined } : n))
    expect(aux(con(d, sinTexto))).toEqual([])
  })

  it('(d) la auxiliar que nombran dos nodos de la cadena corta la cadena', () => {
    const d = definicion([{ id: 'total', texto: '=remate*4%+100' }])
    const dos = d.nodos.map((n) =>
      n.id === 'total' ? { ...n, de: ['total__2', 'total__3', 'total__1'] } : n,
    )
    expect(cadenasDeAuxiliares(con(d, dos).nodos, { visitas: 0 }).size).toBe(0)
  })

  it('(a) un sufijo con cero a la izquierda no abre cadena', () => {
    const d = definicion([{ id: 'total', texto: '=remate*4%' }])
    const cero = d.nodos.map((n) => (n.id === 'total__1' ? { ...n, id: 'total__01' } : n))
    expect(aux(con(d, cero))).toEqual([])
  })
})

// El patrón que la base usa en `_diseno_auxiliares()` para sacar los nombres de un texto (C3 del 4.21-3b-2). Clases enumeradas, sin rangos ni grupos.
const DIGITOS = '0123456789'
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const PATRON_DE_NOMBRES = `[${DIGITOS}.][${LETRAS}${DIGITOS}_$.]*|[${LETRAS}_$][${LETRAS}${DIGITOS}_$]*`
const iniciaNombre = (s: string) => /^[A-Za-z_$]/.test(s)

function nombresDelPatron(texto: string): Set<string> {
  return new Set(
    [...texto.matchAll(new RegExp(PATRON_DE_NOMBRES, 'g'))].map((m) => m[0]).filter(iniciaNombre),
  )
}

// Un PRNG con semilla fija (mulberry32): la misma corrida siempre.
function prng(semilla: number) {
  let a = semilla
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('el patrón de la base da los mismos nombres que el léxico (T1b)', () => {
  const PIEZAS = [
    'a',
    'z',
    'A',
    '_',
    '$',
    '1',
    '0',
    '.',
    'e',
    'E',
    '+',
    '-',
    ' ',
    ' ',
    'ñ',
    'ſ',
    'K',
    '*',
    '(',
    '=',
    ';',
    'total__1',
    'total__10',
    '😀',
  ]

  it('en los casos que muerden', () => {
    for (const t of [
      '=total__1+remate',
      '=remate+1e+total__1',
      '=remate+1etotal__1',
      '=remate+$total__1',
      '=remate+.total__1',
      '=remate+ñtotal__1',
      '=remate+1e+5total__1',
      '=1.5e-3x+total.x',
    ]) {
      expect(nombresDelPatron(t), t).toEqual(nombresDelTexto(t, { visitas: 0 }))
    }
  })

  it('en 5.000 textos al azar', () => {
    const azar = prng(4213)
    for (let i = 0; i < 5000; i += 1) {
      const largo = Math.floor(azar() * 12)
      let t = ''
      for (let j = 0; j < largo; j += 1) t += PIEZAS[Math.floor(azar() * PIEZAS.length)] ?? ''
      expect(nombresDelPatron(t), JSON.stringify(t)).toEqual(nombresDelTexto(t, { visitas: 0 }))
    }
  })
})

// La base lo copia letra por letra (T1c). La ruta va por una variable: Vite reescribe un `new URL` literal.
describe('la migración copia el patrón (T1c)', () => {
  it('_diseno_auxiliares() usa el mismo patrón que T1b', () => {
    const ruta = '../../../../supabase/migrations/20261108043918_diseno_auxiliar_sin_celda.sql'
    const sql = readFileSync(new URL(ruta, import.meta.url), 'utf8')
    expect(sql).toContain(`regexp_matches(v_texto, '${PATRON_DE_NOMBRES}', 'g')`)
  })
})
