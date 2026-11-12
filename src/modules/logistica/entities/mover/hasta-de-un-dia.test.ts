import { describe, expect, it } from 'vitest'
import { hastaDeUnDia } from './hasta-de-un-dia'

describe('hastaDeUnDia', () => {
  it('es el inicio del día siguiente en la zona de la empresa, exclusivo', () => {
    // En La Paz (UTC−4) el día 12 termina cuando en UTC son las 04:00 del 13.
    expect(hastaDeUnDia('2026-11-12', 'America/La_Paz')).toBe('2026-11-13T04:00:00.000Z')
  })
  it('un día que no existe es nulo', () => {
    expect(hastaDeUnDia('2026-13-45', 'America/La_Paz')).toBeNull()
    expect(hastaDeUnDia('ayer', 'America/La_Paz')).toBeNull()
  })
})
