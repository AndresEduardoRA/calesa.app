import { describe, expect, it } from 'vitest'
import {
  cortarPersonas,
  MINIMO_DE_BUSQUEDA_DE_PERSONAS,
  personasDeQuienesReciben,
  textoDeBusqueda,
  TOPE_DE_PERSONAS,
} from './personas'

describe('textoDeBusqueda', () => {
  it('pide al menos 3 letras o dígitos tras recortar', () => {
    expect(MINIMO_DE_BUSQUEDA_DE_PERSONAS).toBe(3)
    expect(textoDeBusqueda('ab')).toBeNull()
    expect(textoDeBusqueda('  ab  ')).toBeNull()
    expect(textoDeBusqueda(' abc ')).toBe('abc')
    expect(textoDeBusqueda('a b')).toBe('a b')
  })
})

describe('cortarPersonas', () => {
  const fila = (n: number) => ({ id: `id-${n}`, nombre: `P${n}` })

  it('con 20 o menos no hay aviso de tope', () => {
    const veinte = Array.from({ length: TOPE_DE_PERSONAS }, (_, i) => fila(i))
    expect(cortarPersonas(veinte)).toEqual({ personas: veinte, hayMas: false })
  })

  it('con 21 muestra 20 y avisa que hay más', () => {
    const leidas = Array.from({ length: TOPE_DE_PERSONAS + 1 }, (_, i) => fila(i))
    const { personas, hayMas } = cortarPersonas(leidas)
    expect(personas).toHaveLength(TOPE_DE_PERSONAS)
    expect(hayMas).toBe(true)
  })
})

describe('personasDeQuienesReciben', () => {
  const id = '00000000-0000-4000-8000-000000000001'

  it('lee la respuesta de la RPC', () => {
    expect(
      personasDeQuienesReciben({ personas: [{ id, nombre: 'Berta' }], hay_mas: true }),
    ).toEqual({
      ok: true,
      data: { personas: [{ id, nombre: 'Berta' }], hayMas: true },
    })
  })

  it('una respuesta de otra forma es un error como valor', () => {
    const r = personasDeQuienesReciben({ personas: [{ nombre: 'Berta' }], hay_mas: false })
    expect(r.ok).toBe(false)
    expect(personasDeQuienesReciben(null).ok).toBe(false)
  })
})
