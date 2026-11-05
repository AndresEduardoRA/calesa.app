import { describe, expect, it } from 'vitest'
import {
  claveDeLaHoja,
  claveDelBorrador,
  claveDelBorradorDeUnaGuardada,
  claveDelPendiente,
  claveDelPendienteDeUnaGuardada,
} from './claves-de-la-hoja'

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

  it('el borrador es de una persona, un origen y un vehículo: el lead no lo cambia (4.14-3b, P1: elegir el cliente conserva lo tipeado)', () => {
    const claves = combinaciones.map((c) => claveDelBorrador(de(c)))
    // Seis hojas, dos de ellas sólo distintas por el lead: cinco claves de borrador.
    expect(new Set(claves).size).toBe(combinaciones.length - 1)
    const h = { personaId: 'p', origenId: 'o', vehiculoId: null }
    expect(claveDelBorrador({ ...h, leadId: null })).toBe(claveDelBorrador({ ...h, leadId: 'l' }))
    expect(claveDelBorrador({ ...h, leadId: 'l1' })).toBe(claveDelBorrador({ ...h, leadId: 'l2' }))
    expect(claveDelBorrador({ ...h, vehiculoId: 'v' })).not.toBe(claveDelBorrador(h))
    expect(claveDelBorrador({ ...h, leadId: 'l' })).not.toBe(
      claveDelPendiente({ ...h, leadId: 'l' }),
    )
  })
})

describe('las claves de una cotización guardada (C9)', () => {
  const base = { personaId: 'p', cotizacionId: 'c', actualizadoEn: 'v1' }

  it('el pendiente es de una persona y una cotización, sin la versión', () => {
    const k = claveDelPendienteDeUnaGuardada(base)
    expect(claveDelPendienteDeUnaGuardada({ ...base, personaId: 'q' })).not.toBe(k)
    expect(claveDelPendienteDeUnaGuardada({ ...base, cotizacionId: 'd' })).not.toBe(k)
    const conOtraVersion = { ...base, actualizadoEn: 'v2' }
    expect(claveDelPendienteDeUnaGuardada(conOtraVersion)).toBe(k)
  })

  it('el borrador lleva la versión: tras «Recargar» por un conflicto lo tipeado no vuelve sobre lo de la otra persona', () => {
    const k = claveDelBorradorDeUnaGuardada(base)
    expect(claveDelBorradorDeUnaGuardada({ ...base, actualizadoEn: 'v2' })).not.toBe(k)
    expect(claveDelBorradorDeUnaGuardada({ ...base, personaId: 'q' })).not.toBe(k)
    expect(claveDelBorradorDeUnaGuardada({ ...base, cotizacionId: 'd' })).not.toBe(k)
  })

  it('no chocan con las de la hoja nueva ni entre sí', () => {
    const nueva = { personaId: 'p', origenId: 'c', leadId: null, vehiculoId: null }
    const claves = [
      claveDelPendienteDeUnaGuardada(base),
      claveDelBorradorDeUnaGuardada(base),
      claveDelPendiente(nueva),
      claveDelBorrador(nueva),
    ]
    expect(new Set(claves).size).toBe(4)
  })
})
