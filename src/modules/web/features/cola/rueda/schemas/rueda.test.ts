import { describe, expect, it } from 'vitest'
import { esquemaConfiguracionGuardada, esquemaEnLaRueda } from './rueda'

const fila = {
  usuarioId: '00000000-0000-4000-8000-000000000001',
  maxAbiertas: null,
  prioridad: 11,
  orden: 1000,
}

describe('rangos de la rueda', () => {
  it('el formulario no acepta prioridad ni orden fuera de sus rangos', () => {
    expect(esquemaEnLaRueda.safeParse(fila).success).toBe(false)
  })

  it('quitar y «Deshacer» aceptan los valores que ya tenía la fila (todo smallint)', () => {
    expect(esquemaConfiguracionGuardada.safeParse(fila).success).toBe(true)
    expect(esquemaConfiguracionGuardada.safeParse({ ...fila, prioridad: -5 }).success).toBe(true)
    expect(esquemaConfiguracionGuardada.safeParse({ ...fila, orden: 40000 }).success).toBe(false)
  })
})
