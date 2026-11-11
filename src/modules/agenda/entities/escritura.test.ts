import { describe, expect, it } from 'vitest'
import { leerResultadoDeEscritura } from './escritura'

describe('leerResultadoDeEscritura', () => {
  it('lee la respuesta de la RPC y pasa la versión a camelCase', () => {
    const lectura = leerResultadoDeEscritura({
      resultado: 'creado',
      id: '00000000-0000-4000-8000-000000000001',
      actualizado_en: '2026-11-11T14:00:00.123456+00:00',
    })
    expect(lectura).toEqual({
      ok: true,
      data: {
        resultado: 'creado',
        id: '00000000-0000-4000-8000-000000000001',
        actualizadoEn: '2026-11-11T14:00:00.123456+00:00',
      },
    })
  })

  it('una respuesta sin id es un error como valor, no una excepción', () => {
    const lectura = leerResultadoDeEscritura({
      resultado: 'creado',
      actualizado_en: '2026-11-11T14:00:00+00:00',
    })
    expect(lectura.ok).toBe(false)
    expect(leerResultadoDeEscritura(null).ok).toBe(false)
  })
})
