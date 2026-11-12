import { describe, expect, it } from 'vitest'
import { cortarPersonas, TOPE_DE_PERSONAS, textoDeBusqueda } from './personas'

const persona = (n: number) => ({ id: `id-${String(n)}`, nombre: `Persona ${String(n)}` })

describe('textoDeBusqueda', () => {
  it('no busca con menos de 3 caracteres, aunque haya espacios', () => {
    expect(textoDeBusqueda('ab')).toBeNull()
    expect(textoDeBusqueda('  ab  ')).toBeNull()
    expect(textoDeBusqueda('')).toBeNull()
  })

  it('recorta y busca desde 3 caracteres', () => {
    expect(textoDeBusqueda('abc')).toBe('abc')
    expect(textoDeBusqueda('  Marta ')).toBe('Marta')
  })

  it('cuenta caracteres y no unidades UTF-16', () => {
    expect(textoDeBusqueda('ñañá')).toBe('ñañá')
    expect(textoDeBusqueda('😀😀')).toBeNull()
    expect(textoDeBusqueda('😀😀😀')).toBe('😀😀😀')
  })
})

describe('cortarPersonas', () => {
  it('con una de más corta en el tope y dice que hay más', () => {
    const leidas = Array.from({ length: TOPE_DE_PERSONAS + 1 }, (_, n) => persona(n))
    const cortadas = cortarPersonas(leidas)
    expect(cortadas.personas).toHaveLength(TOPE_DE_PERSONAS)
    expect(cortadas.hayMas).toBe(true)
  })

  it('con las del tope no dice que hay más', () => {
    const leidas = Array.from({ length: TOPE_DE_PERSONAS }, (_, n) => persona(n))
    expect(cortarPersonas(leidas)).toEqual({ personas: leidas, hayMas: false })
  })
})
