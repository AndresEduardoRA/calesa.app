import { describe, expect, it } from 'vitest'
import { claveDeLaHoja, claveDelBorrador, claveDelPendiente } from './claves-de-la-hoja'

describe('claveDeLaHoja', () => {
  it('cambia con la fórmula, con el vehículo, con la vuelta («Descartar») y con la hoja abierta (D2)', () => {
    const de = (m: Partial<Parameters<typeof claveDeLaHoja>[0]> = {}) =>
      claveDeLaHoja({ formulaId: 'f', vehiculoId: null, vuelta: 0, abierta: 'a', ...m })
    expect(de({ formulaId: 'g' })).not.toBe(de())
    expect(de({ vehiculoId: 'v' })).not.toBe(de())
    expect(de({ vuelta: 1 })).not.toBe(de())
    expect(de({ abierta: 'b' })).not.toBe(de())
    expect(de()).toBe(de())
  })
})

describe('las claves de la pestaña', () => {
  const combinaciones = [
    ['p1', 'o1', 'l1', null],
    ['p2', 'o1', 'l1', null],
    ['p1', 'o2', 'l1', null],
    ['p1', 'o1', 'l2', null],
    ['p1', 'o1', 'l1', 'v1'],
    ['p1', 'o1', 'l1', 'v2'],
  ] as const
  const de = ([personaId, origenId, leadId, vehiculoId]: (typeof combinaciones)[number]) => ({
    personaId,
    origenId,
    leadId,
    vehiculoId,
  })

  it('el pendiente es de una persona y una hoja: otra cuenta, otro origen, otro lead u otro vehículo es otra clave', () => {
    const claves = combinaciones.map((c) => claveDelPendiente(de(c)))
    expect(new Set(claves).size).toBe(combinaciones.length)
  })

  it('el borrador también, y no se confunde con el pendiente', () => {
    const claves = combinaciones.map((c) => claveDelBorrador(de(c)))
    expect(new Set(claves).size).toBe(combinaciones.length)
    const h = { personaId: 'p', origenId: 'o', vehiculoId: null }
    expect(claveDelBorrador({ ...h, leadId: null })).not.toBe(
      claveDelBorrador({ ...h, leadId: 'l' }),
    )
    expect(claveDelBorrador({ ...h, leadId: 'l' })).not.toBe(
      claveDelPendiente({ ...h, leadId: 'l' }),
    )
  })
})
