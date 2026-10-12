import { describe, expect, it } from 'vitest'
import { AJUSTES_POR_DEFECTO, ajustesDesde, registroDisponible } from './ajustes'

const fila = {
  nombre: 'Importadora Andina',
  logo_ruta: 'logo.png',
  color_acento: '#0b7285',
  iconos: null,
  locale: 'es-BO',
  zona_horaria: 'America/La_Paz',
  moneda_base: 'USD',
  registro_abierto: false,
  primer_registro: true,
}

describe('ajustesDesde', () => {
  it('convierte la fila de la RPC', () => {
    expect(ajustesDesde(fila)).toEqual({
      nombre: 'Importadora Andina',
      logoRuta: 'logo.png',
      colorAcento: '#0b7285',
      iconos: null,
      locale: 'es-BO',
      zonaHoraria: 'America/La_Paz',
      monedaBase: 'USD',
      registroAbierto: false,
      primerRegistro: true,
    })
  })

  it('acepta una empresa sin logo ni color', () => {
    const ajustes = ajustesDesde({ ...fila, logo_ruta: null, color_acento: null })
    expect(ajustes?.logoRuta).toBeNull()
    expect(ajustes?.colorAcento).toBeNull()
  })

  it('unos íconos con otra forma no tumban los ajustes: valen los neutros', () => {
    expect(ajustesDesde({ ...fila, iconos: { '192': 'cualquiera' } })?.iconos).toBeNull()
    const hash = 'b'.repeat(64)
    const iconos = Object.fromEntries(
      ['32', '180', '192', '512', '512m'].map((clave) => [clave, `iconos/${hash}.png`]),
    )
    expect(ajustesDesde({ ...fila, iconos })?.iconos).toEqual(iconos)
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
