import { describe, expect, it } from 'vitest'
import { admiteValorDefecto, valorDefectoPara } from './valor-defecto'

const OPCIONES = [
  { clave: 'a', etiqueta: 'A' },
  { clave: 'b', etiqueta: 'B' },
]

describe('admiteValorDefecto', () => {
  it('no lo llevan la fecha, el enlace, el VIN ni el lote', () => {
    expect(admiteValorDefecto('texto')).toBe(true)
    expect(admiteValorDefecto('booleano')).toBe(true)
    expect(admiteValorDefecto('multi_opcion')).toBe(true)
    expect(admiteValorDefecto('fecha')).toBe(false)
    expect(admiteValorDefecto('fecha_hora')).toBe(false)
    expect(admiteValorDefecto('url')).toBe(false)
    expect(admiteValorDefecto('vin')).toBe(false)
    expect(admiteValorDefecto('lote')).toBe(false)
  })
})

describe('valorDefectoPara', () => {
  it('acepta lo que es del tipo', () => {
    expect(valorDefectoPara('texto', [], 'Gris')).toBe('Gris')
    expect(valorDefectoPara('numero', [], 4)).toBe(4)
    expect(valorDefectoPara('moneda', [], 0)).toBe(0)
    expect(valorDefectoPara('booleano', [], false)).toBe(false)
    expect(valorDefectoPara('opcion', OPCIONES, 'a')).toBe('a')
    expect(valorDefectoPara('multi_opcion', OPCIONES, ['a', 'b'])).toEqual(['a', 'b'])
  })

  it('lo que no es del tipo o está vacío es «sin valor»', () => {
    expect(valorDefectoPara('texto', [], '')).toBeNull()
    expect(valorDefectoPara('texto', [], 'x'.repeat(501))).toBeNull()
    expect(valorDefectoPara('numero', [], '4')).toBeNull()
    expect(valorDefectoPara('numero', [], Number.NaN)).toBeNull()
    expect(valorDefectoPara('booleano', [], 'si')).toBeNull()
    expect(valorDefectoPara('multi_opcion', OPCIONES, [])).toBeNull()
    expect(valorDefectoPara('fecha', [], '2026-01-01')).toBeNull()
  })

  it('una opción que ya no existe deja de ser el valor por defecto', () => {
    expect(valorDefectoPara('opcion', OPCIONES, 'z')).toBeNull()
    expect(valorDefectoPara('multi_opcion', OPCIONES, ['a', 'z'])).toEqual(['a'])
    expect(valorDefectoPara('multi_opcion', OPCIONES, ['z'])).toBeNull()
  })
})
