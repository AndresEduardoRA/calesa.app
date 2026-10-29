import { describe, expect, it } from 'vitest'
import { modoInicial, ofreceVerTotalBs, totalBsDelResumen } from './cabecera-de-la-hoja'
import { respuestaDePrueba } from './hoja-de-prueba.soporte'

const modo = (clave: string) => ({ clave, nombre: clave.toUpperCase() })

describe('modoInicial', () => {
  it('es el primero de los modos que declara el diseño (P1)', () => {
    expect(modoInicial({ modos: [modo('paralelo'), modo('unificado')] })).toBe('paralelo')
  })

  it('con uno solo, ese; sin modos, nulo', () => {
    expect(modoInicial({ modos: [modo('m1')] })).toBe('m1')
    expect(modoInicial({ modos: [] })).toBeNull()
  })
})

describe('ofreceVerTotalBs (P6)', () => {
  it.each([
    [true, 'BOB', true],
    [true, null, false],
    [false, 'BOB', false],
    [false, null, false],
  ])('el diseño lo ofrece %s y la moneda es %s: %s', (verTotalBs, monedaBs, esperado) => {
    expect(ofreceVerTotalBs({ verTotalBs, monedaBs })).toBe(esperado)
  })
})

describe('totalBsDelResumen', () => {
  it('sin respuesta no hay; con ella y sin valor falta; con valor, el valor', () => {
    expect(totalBsDelResumen(null)).toEqual({ tipo: 'sin_calcular' })
    expect(totalBsDelResumen(respuestaDePrueba())).toEqual({ tipo: 'faltante' })
    const conBs = respuestaDePrueba()
    expect(totalBsDelResumen({ ...conBs, totales: { ...conBs.totales, bs: 69.6 } })).toEqual({
      tipo: 'valor',
      bs: 69.6,
    })
  })
})
