import { describe, expect, it } from 'vitest'
import casos from '../casos-de-diseno.json'
import { esquemaDiseno, type Diseno } from '../diseno'
import { esquemaDefinicion } from '../formula'
import { validarDiseno } from '../validar-diseno'
import {
  claveDeModo,
  ponerModo,
  ponerVerTotalBs,
  quitarModo,
  sumarModo,
  tiposDeCambio,
} from './edicion-de-la-cabecera'
import {
  alternarSecundario,
  apartesPosibles,
  ponerTotalDeLaTarjeta,
  totalesPosibles,
} from './edicion-de-la-tarjeta'

const contexto = { niveles: ['costos'], retirados: [], tonos: ['compra'] }
const contextoDelJuego = () => (casos as { contexto: typeof contexto }).contexto

// Congela hasta el fondo: una función que mutara lo que recibe cae con un TypeError.
function congelar<T>(valor: T): T {
  if (typeof valor === 'object' && valor !== null) {
    Object.values(valor).forEach(congelar)
    Object.freeze(valor)
  }
  return valor
}

const definicion = esquemaDefinicion.parse({
  buckets: { exterior: 'tc_a', aduana: 'tc_b' },
  total_en: 'tc_c',
  nodos: [
    { id: 'tc_a', tipo: 'tipo_cambio', clave: 'a', etiqueta: 'TC A' },
    { id: 'tc_b', tipo: 'tipo_cambio', clave: 'b', etiqueta: 'TC B' },
    { id: 'tc_c', tipo: 'tipo_cambio', clave: 'c', etiqueta: 'TC C' },
    { id: 'a', tipo: 'input', etiqueta: 'A' },
    { id: 'b', tipo: 'input', etiqueta: 'B', salida: 'aparte' },
    { id: 'g', tipo: 'input', etiqueta: 'G', salida: 'aparte' },
    { id: 'neto', tipo: 'calculo', op: 'suma', de: ['a'], etiqueta: 'Neto', salida: 'total' },
    { id: 'otro', tipo: 'calculo', op: 'suma', de: ['a', 'b'], etiqueta: 'Otro', salida: 'total' },
  ],
})
const base = (): Diseno =>
  congelar(
    esquemaDiseno.parse({
      cabecera: { modos: [], ver_total_bs: false },
      secciones: [
        {
          id: 's',
          presentacion: 'principal',
          items: [
            { tipo: 'celda', nodo: 'a', ancho: 'completo' },
            { tipo: 'celda', nodo: 'tc_a', ancho: 'tercio' },
            { tipo: 'celda', nodo: 'tc_b', ancho: 'tercio' },
            { tipo: 'celda', nodo: 'tc_c', ancho: 'tercio' },
            { tipo: 'celda', nodo: 'b', ancho: 'completo' },
            { tipo: 'celda', nodo: 'g', ancho: 'completo' },
            { tipo: 'celda', nodo: 'neto', ancho: 'completo' },
            { tipo: 'celda', nodo: 'otro', ancho: 'completo' },
          ],
        },
      ],
      tarjeta_total: { nodo: 'neto', secundarios: [] },
    }),
  )

describe('la cabecera: modos y total en Bs', () => {
  it('T1 · sumarModo copia el mapa de la fórmula y el diseño sigue validando', () => {
    const d = sumarModo(definicion, base(), 'Paralelo')
    expect(d.cabecera.modos).toStrictEqual([
      {
        clave: 'paralelo',
        nombre: 'Paralelo',
        buckets: [
          { bucket: 'exterior', nodo: 'tc_a' },
          { bucket: 'aduana', nodo: 'tc_b' },
        ],
        total_en: 'tc_c',
      },
    ])
    expect(validarDiseno(definicion, d, contexto)).toStrictEqual({ ok: true, diseno: d })
  })

  it('T1 · el mismo nombre dos veces da claves paralelo y paralelo_2; la clave sale limpia', () => {
    const una = sumarModo(definicion, base(), 'Paralelo')
    const dos = sumarModo(definicion, una, 'Paralelo')
    expect(dos.cabecera.modos.map((m) => m.clave)).toStrictEqual(['paralelo', 'paralelo_2'])
    expect(claveDeModo('Dólar  Unificado!', [])).toBe('dolar_unificado_')
    expect(claveDeModo('1 mes', [])).toBe('modo_1_mes')
    expect(claveDeModo('x'.repeat(60), [])).toHaveLength(41)
    expect(validarDiseno(definicion, dos, contexto).ok).toBe(true)
  })

  it('T1 · sin total_en, sin buckets o con nombre vacío no suma nada', () => {
    const d = base()
    expect(sumarModo({ ...definicion, total_en: undefined }, d, 'X')).toBe(d)
    expect(sumarModo({ ...definicion, buckets: {} }, d, 'X')).toBe(d)
    expect(sumarModo(definicion, d, '   ')).toBe(d)
  })

  it('T1 · el nombre se corta a 40 caracteres', () => {
    const d = sumarModo(definicion, base(), 'n'.repeat(50))
    expect(d.cabecera.modos[0]?.nombre).toHaveLength(40)
  })

  it('T2 · ponerModo cambia sólo el bucket pedido, el total y el nombre; el orden se mantiene', () => {
    const d0 = sumarModo(definicion, base(), 'Paralelo')
    const d = ponerModo(d0, 'paralelo', {
      nombre: ' Otro ',
      bucket: { bucket: 'aduana', nodo: 'tc_c' },
      total_en: 'tc_a',
    })
    expect(d.cabecera.modos[0]).toStrictEqual({
      clave: 'paralelo',
      nombre: 'Otro',
      buckets: [
        { bucket: 'exterior', nodo: 'tc_a' },
        { bucket: 'aduana', nodo: 'tc_c' },
      ],
      total_en: 'tc_a',
    })
    expect(validarDiseno(definicion, d, contexto).ok).toBe(true)
    expect(ponerModo(d0, 'paralelo', { nombre: '   ' }).cabecera.modos[0]?.nombre).toBe('Paralelo')
    expect(ponerModo(d0, 'no_existe', { nombre: 'Z' })).toStrictEqual(d0)
  })

  it('T2 · quitarModo quita sólo ése; ponerVerTotalBs lo enciende; nada muta', () => {
    const dos = sumarModo(definicion, sumarModo(definicion, base(), 'A'), 'B')
    congelar(dos)
    expect(quitarModo(dos, 'a').cabecera.modos.map((m) => m.clave)).toStrictEqual(['b'])
    expect(ponerVerTotalBs(dos, true).cabecera.ver_total_bs).toBe(true)
    expect(dos.cabecera.ver_total_bs).toBe(false)
  })

  it('tiposDeCambio da los nodos tipo_cambio con su etiqueta, en el orden de la fórmula', () => {
    expect(tiposDeCambio(definicion)).toStrictEqual([
      { id: 'tc_a', etiqueta: 'TC A' },
      { id: 'tc_b', etiqueta: 'TC B' },
      { id: 'tc_c', etiqueta: 'TC C' },
    ])
  })
})

describe('la tarjeta del total', () => {
  it('T3 · totalesPosibles y apartesPosibles, en el orden de la fórmula', () => {
    expect(totalesPosibles(definicion).map((n) => n.id)).toStrictEqual(['neto', 'otro'])
    expect(apartesPosibles(definicion).map((n) => n.id)).toStrictEqual(['b', 'g'])
  })

  it('T3 · alternarSecundario agrega al final, quita y no repite', () => {
    const uno = alternarSecundario(base(), 'g')
    expect(uno.tarjeta_total.secundarios).toStrictEqual(['g'])
    const dos = alternarSecundario(uno, 'b')
    expect(dos.tarjeta_total.secundarios).toStrictEqual(['g', 'b'])
    expect(alternarSecundario(dos, 'g').tarjeta_total.secundarios).toStrictEqual(['b'])
  })

  it('T3 · ponerTotalDeLaTarjeta cambia el nodo; con un secundario el diseño valida', () => {
    const d = alternarSecundario(ponerTotalDeLaTarjeta(base(), 'otro'), 'b')
    expect(d.tarjeta_total).toStrictEqual({ nodo: 'otro', secundarios: ['b'] })
    expect(validarDiseno(definicion, d, contexto).ok).toBe(true)
  })

  it('T3 · el diseño de las capturas con un aparte quitado y puesto sigue validando', () => {
    const juego = casos as unknown as {
      formulas: Record<string, { definicion: unknown }>
      casos: { nombre: string; diseno: unknown }[]
    }
    const caso = juego.casos.find((c) => c.nombre.startsWith('capturas'))
    const def = esquemaDefinicion.parse(juego.formulas['capturas']?.definicion)
    const d = esquemaDiseno.parse(caso?.diseno)
    const sin = alternarSecundario(d, 'garantia')
    expect(sin.tarjeta_total.secundarios).toStrictEqual([])
    expect(validarDiseno(def, sin, contextoDelJuego()).ok).toBe(true)
    expect(validarDiseno(def, alternarSecundario(sin, 'garantia'), contextoDelJuego()).ok).toBe(
      true,
    )
  })
})
