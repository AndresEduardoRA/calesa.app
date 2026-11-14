import { describe, expect, it } from 'vitest'

import { refDeUnidad, type Unidad } from './unidad'

const base = {
  id: '3f8b1c1e-0d6a-4b5e-9a39-2d6a7e1f4c10',
  origenId: 'o1',
  titulo: 'Toyota Hilux',
  faseId: null,
  faseDesde: null,
  situacion: 'fase' as const,
}

describe('refDeUnidad', () => {
  it('un vehículo da vehiculo_id y nunca repuesto_id', () => {
    const u: Unidad = { tipo: 'vehiculo', ...base }
    expect(refDeUnidad(u)).toEqual({ vehiculo_id: base.id })
    expect(Object.keys(refDeUnidad(u))).toEqual(['vehiculo_id'])
  })

  it('un repuesto da repuesto_id y nunca vehiculo_id', () => {
    const u: Unidad = { tipo: 'repuesto', ...base }
    expect(refDeUnidad(u)).toEqual({ repuesto_id: base.id })
    expect(Object.keys(refDeUnidad(u))).toEqual(['repuesto_id'])
  })
})
