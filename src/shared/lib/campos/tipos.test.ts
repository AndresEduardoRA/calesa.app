import { describe, expect, it } from 'vitest'
import { ETIQUETA_DE_TIPO_DE_CAMPO, TIPOS_DE_CAMPO, tieneOpciones } from './tipos'

describe('tieneOpciones', () => {
  it('sólo los campos de opciones', () => {
    expect(tieneOpciones('opcion')).toBe(true)
    expect(tieneOpciones('multi_opcion')).toBe(true)
    expect(tieneOpciones('texto')).toBe(false)
  })
})

describe('TIPOS_DE_CAMPO', () => {
  it('cada tipo tiene su etiqueta y no se repite', () => {
    expect(new Set(TIPOS_DE_CAMPO).size).toBe(TIPOS_DE_CAMPO.length)
    for (const tipo of TIPOS_DE_CAMPO) {
      expect(ETIQUETA_DE_TIPO_DE_CAMPO[tipo].length).toBeGreaterThan(0)
    }
  })
})
