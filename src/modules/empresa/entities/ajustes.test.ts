import { describe, expect, it } from 'vitest'
import { AJUSTES_POR_DEFECTO, ajustesDesde, registroDisponible } from './ajustes'

const fila = {
  nombre: 'Importadora Andina',
  logo_ruta: 'logo.png',
  locale: 'es-BO',
  moneda_base: 'USD',
  registro_abierto: false,
  primer_registro: true,
}

describe('ajustesDesde', () => {
  it('convierte la fila de la RPC', () => {
    expect(ajustesDesde(fila)).toEqual({
      nombre: 'Importadora Andina',
      logoRuta: 'logo.png',
      locale: 'es-BO',
      monedaBase: 'USD',
      registroAbierto: false,
      primerRegistro: true,
    })
  })

  it('acepta una empresa sin logo', () => {
    expect(ajustesDesde({ ...fila, logo_ruta: null })?.logoRuta).toBeNull()
  })

  it('devuelve null si la respuesta no tiene la forma esperada', () => {
    expect(ajustesDesde(null)).toBeNull()
    expect(ajustesDesde({ ...fila, registro_abierto: 'si' })).toBeNull()
    expect(ajustesDesde({ ...fila, moneda_base: 'DOLAR' })).toBeNull()
  })
})

describe('registroDisponible', () => {
  it('con el registro abierto, sí', () => {
    expect(registroDisponible({ registroAbierto: true, primerRegistro: false })).toBe(true)
  })

  it('cerrado pero sin nadie en el equipo, sí: es la primera cuenta', () => {
    expect(registroDisponible({ registroAbierto: false, primerRegistro: true })).toBe(true)
  })

  it('cerrado y con equipo, no', () => {
    expect(registroDisponible({ registroAbierto: false, primerRegistro: false })).toBe(false)
  })

  it('los ajustes por defecto dejan el registro cerrado', () => {
    expect(registroDisponible(AJUSTES_POR_DEFECTO)).toBe(false)
  })
})
