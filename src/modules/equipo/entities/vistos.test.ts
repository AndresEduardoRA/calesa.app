import { describe, expect, it } from 'vitest'
import {
  conAbierto,
  lecturaDeVistosDesde,
  marcaDeVisto,
  preferenciaDeVistosDesde,
  SIN_VISTOS,
  unidas,
  VISTOS_POR_DEFECTO,
} from './vistos'

const A = '0b1c2d3e-0000-4000-8000-00000000000a'
const B = '0b1c2d3e-0000-4000-8000-00000000000b'

describe('vistos', () => {
  it('la preferencia completa lo que falte y rechaza días fuera de la lista', () => {
    expect(preferenciaDeVistosDesde(undefined)).toEqual(VISTOS_POR_DEFECTO)
    expect(preferenciaDeVistosDesde({ dias: 30 })).toEqual({ ...VISTOS_POR_DEFECTO, dias: 30 })
    expect(preferenciaDeVistosDesde({ dias: 15 })).toEqual(VISTOS_POR_DEFECTO)
  })

  it('marca el último, lo visto y nada, según la preferencia', () => {
    const lectura = { vistos: new Set([A]), ultimo: B }
    expect(marcaDeVisto(B, lectura, VISTOS_POR_DEFECTO)).toBe('ultimo')
    expect(marcaDeVisto(A, lectura, VISTOS_POR_DEFECTO)).toBe('visto')
    expect(marcaDeVisto(B, lectura, { ...VISTOS_POR_DEFECTO, ultimo: false })).toBe('visto')
    expect(marcaDeVisto(A, lectura, { ...VISTOS_POR_DEFECTO, activado: false })).toBeNull()
    expect(marcaDeVisto('otro', SIN_VISTOS, VISTOS_POR_DEFECTO)).toBeNull()
  })

  it('abrir uno lo vuelve el último y lee lo de la base', () => {
    expect(conAbierto(SIN_VISTOS, A)).toEqual({ vistos: new Set([A]), ultimo: A })
    expect(lecturaDeVistosDesde({ vistos: [{ id: A, visto_en: 'x' }], ultimo: A })).toEqual({
      vistos: new Set([A]),
      ultimo: A,
    })
    expect(lecturaDeVistosDesde({ vistos: 'no' })).toBeNull()
  })
  it('lo abierto en la pestaña se suma a lo leído y manda en el último', () => {
    const leida = { vistos: new Set([A]), ultimo: A }
    expect(unidas(leida, conAbierto(SIN_VISTOS, B))).toEqual({ vistos: new Set([A, B]), ultimo: B })
    expect(unidas(leida, SIN_VISTOS)).toEqual(leida)
  })
})
