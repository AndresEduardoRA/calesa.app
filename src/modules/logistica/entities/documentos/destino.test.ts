import { describe, expect, it } from 'vitest'
import { destinoDeLaUnidad, destinoDelGrupo } from './destino'

describe('destino de lo que se sube', () => {
  it('una unidad: carpeta propia y se avisa a su panel', () => {
    expect(destinoDeLaUnidad({ tipo: 'vehiculo', id: 'v1' })).toEqual({
      carpeta: 'v1',
      vehiculos: ['v1'],
      repuestoId: null,
      unidadParaAvisar: 'v1',
    })
    expect(destinoDeLaUnidad({ tipo: 'repuesto', id: 'r1' })).toMatchObject({
      vehiculos: [],
      repuestoId: 'r1',
    })
  })

  it('un grupo: ordenado, sin repetidas, carpeta de la primera y nada que releer', () => {
    expect(destinoDelGrupo(['b', 'a', 'b'])).toEqual({
      carpeta: 'a',
      vehiculos: ['a', 'b'],
      repuestoId: null,
      unidadParaAvisar: null,
    })
  })

  it('un grupo vacío o de más de 100 unidades no tiene destino', () => {
    expect(destinoDelGrupo([])).toBeNull()
    const muchas = Array.from({ length: 101 }, (_, i) => `v${String(i).padStart(3, '0')}`)
    expect(destinoDelGrupo(muchas)).toBeNull()
    expect(destinoDelGrupo(muchas.slice(0, 100))).not.toBeNull()
  })
})
