import { describe, expect, it } from 'vitest'
import { claveDeCampo, claveDeTexto } from './clave'

const ESTILO = { prefijo: 'c_', vacio: 'campo' }

describe('claveDeTexto', () => {
  it('quita acentos, pasa a minúsculas y usa guion bajo', () => {
    expect(claveDeTexto('Signo zodiacal', 36, ESTILO)).toBe('signo_zodiacal')
    expect(claveDeTexto('  Ciudad de residencia  ', 36, ESTILO)).toBe('ciudad_de_residencia')
    expect(claveDeTexto('Año', 36, ESTILO)).toBe('ano')
  })

  it('empieza siempre con una letra, con el prefijo del módulo', () => {
    expect(claveDeTexto('4x4', 36, ESTILO)).toBe('c_4x4')
    expect(claveDeTexto('4x4', 36, { prefijo: 'o_', vacio: 'origen' })).toBe('o_4x4')
  })

  it('cabe en el largo y no termina en guion bajo', () => {
    const clave = claveDeTexto('Importaciones directas desde los puertos', 12, ESTILO)
    expect(clave.length).toBeLessThanOrEqual(12)
    expect(clave.endsWith('_')).toBe(false)
  })

  it('si no queda nada con sentido, usa el vacío del módulo', () => {
    expect(claveDeTexto('!!!', 36, ESTILO)).toBe('campo')
    expect(claveDeTexto('', 36, { prefijo: 'o_', vacio: 'origen' })).toBe('origen')
  })
})

describe('claveDeCampo', () => {
  it('sale de la etiqueta', () => {
    expect(claveDeCampo('Kit de extras', [], [], ESTILO)).toBe('kit_de_extras')
  })

  it('no choca con una reservada ni con otro campo: sufija', () => {
    expect(claveDeCampo('VIN', [], ['vin'], ESTILO)).toBe('vin_2')
    expect(claveDeCampo('Color', ['color'], [], ESTILO)).toBe('color_2')
    expect(claveDeCampo('Color', ['color', 'color_2'], [], ESTILO)).toBe('color_3')
  })
})
