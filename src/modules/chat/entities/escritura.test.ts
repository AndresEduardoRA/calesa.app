import { describe, expect, it } from 'vitest'
import { leerResultadoDeConversacion, puedeSalirDe } from './escritura'

const id = '00000000-0000-4000-8000-000000000001'

describe('leerResultadoDeConversacion', () => {
  it('acepta un resultado con su id', () => {
    expect(leerResultadoDeConversacion({ resultado: 'creada', id })).toEqual({
      ok: true,
      data: { resultado: 'creada', id },
    })
  })

  it('rechaza como valor, no como excepción, lo mal formado', () => {
    for (const malo of [
      { resultado: 'creada' },
      { resultado: 'creada', id: 'no-es-guid' },
      { id },
      { resultado: '', id },
      null,
    ]) {
      const leido = leerResultadoDeConversacion(malo)
      expect(leido.ok).toBe(false)
    }
  })
})

describe('puedeSalirDe', () => {
  it('una directa no se deja; un grupo y el canal global sí', () => {
    expect(puedeSalirDe({ tipo: 'directa' })).toBe(false)
    expect(puedeSalirDe({ tipo: 'grupo' })).toBe(true)
    expect(puedeSalirDe({ tipo: 'global' })).toBe(true)
  })
})
