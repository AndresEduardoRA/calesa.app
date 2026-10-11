import { describe, expect, it } from 'vitest'
import { AVISOS, avisoDe } from './avisos'

describe('avisoDe', () => {
  it('devuelve el aviso de una clave conocida', () => {
    expect(avisoDe('bloqueada')).toBe(AVISOS.bloqueada)
    expect(avisoDe('enlace_vencido')?.tono).toBe('aviso')
  })

  it('ignora lo que no es una clave del catálogo', () => {
    expect(avisoDe('Tu cuenta fue hackeada, llama al 555')).toBeNull()
    expect(avisoDe('toString')).toBeNull()
    expect(avisoDe(null)).toBeNull()
    expect(avisoDe(undefined)).toBeNull()
  })

  it('ningún aviso lleva signos de exclamación', () => {
    for (const aviso of Object.values(AVISOS)) {
      expect(aviso.mensaje).not.toMatch(/[¡!]/)
    }
  })
})
