import { describe, expect, it } from 'vitest'
import { agruparCampos, nombresDeGrupo } from './agrupar'

function campo(clave: string, grupo: string | null, activo = true) {
  return { clave, grupo, activo }
}

describe('agruparCampos', () => {
  it('agrupa por el primer campo de cada grupo y deja «sin grupo» al final', () => {
    const grupos = agruparCampos([
      campo('c1', null),
      campo('c2', 'Subasta'),
      campo('c3', 'Vehículo'),
      campo('c4', 'Subasta'),
    ])
    expect(grupos.map((g) => g.nombre)).toEqual(['Subasta', 'Vehículo', null])
    expect(grupos[0]?.campos.map((c) => c.clave)).toEqual(['c2', 'c4'])
  })

  it('no muestra los desactivados', () => {
    const grupos = agruparCampos([campo('c1', 'Vehículo'), campo('c2', 'Vehículo', false)])
    expect(grupos.flatMap((g) => g.campos)).toHaveLength(1)
    expect(nombresDeGrupo([campo('c1', 'Vehículo'), campo('c2', 'Venta', false)])).toEqual([
      'Vehículo',
    ])
  })

  it('sin campos activos no hay grupos', () => {
    expect(agruparCampos([campo('c1', 'Venta', false)])).toEqual([])
  })
})
