import { describe, expect, it } from 'vitest'
import { CLAVE_DE_ELEGIR, claveParaElegir } from './elegir-al-crear'

describe('claveParaElegir', () => {
  it('la clave de la URL es «elegir»', () => {
    expect(CLAVE_DE_ELEGIR).toBe('elegir')
  })

  it('un nombre de 1 a 20 letras minúsculas pasa tal cual', () => {
    expect(claveParaElegir('lead')).toBe('lead')
    expect(claveParaElegir('vehiculo')).toBe('vehiculo')
    expect(claveParaElegir('a')).toBe('a')
    expect(claveParaElegir('a'.repeat(20))).toBe('a'.repeat(20))
  })

  it('las claves de la propia URL del alta no se aceptan', () => {
    expect(claveParaElegir('panel')).toBeNull()
    expect(claveParaElegir('elegir')).toBeNull()
  })

  it('vacío, nulo, mayúsculas, dígitos, símbolos y más de 20 letras dan nulo', () => {
    expect(claveParaElegir(null)).toBeNull()
    expect(claveParaElegir('')).toBeNull()
    expect(claveParaElegir('Lead')).toBeNull()
    expect(claveParaElegir('lead2')).toBeNull()
    expect(claveParaElegir('a=b')).toBeNull()
    expect(claveParaElegir('a b')).toBeNull()
    expect(claveParaElegir('a"]')).toBeNull()
    expect(claveParaElegir('a'.repeat(21))).toBeNull()
  })
})
