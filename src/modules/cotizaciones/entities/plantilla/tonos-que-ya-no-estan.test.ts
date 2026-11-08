import { describe, expect, it } from 'vitest'
import { tonosQueYaNoEstan } from './tonos-que-ya-no-estan'

describe('tonosQueYaNoEstan', () => {
  it('un grupo sin tono usa el del grupo: nunca falta', () => {
    expect(tonosQueYaNoEstan([{ grupo: 'compra' }], [])).toEqual([])
  })

  it('con el catálogo vacío, todos los que eligen uno', () => {
    expect(tonosQueYaNoEstan([{ grupo: 'compra', tono: 'verde' }, { grupo: 'flete' }], [])).toEqual(
      [{ grupo: 'compra', tono: 'verde' }],
    )
  })

  it('en el orden de la plantilla', () => {
    const grupos = [
      { grupo: 'b', tono: 'rojo' },
      { grupo: 'a', tono: 'verde' },
      { grupo: 'c', tono: 'gris' },
    ]
    expect(tonosQueYaNoEstan(grupos, ['verde'])).toEqual([
      { grupo: 'b', tono: 'rojo' },
      { grupo: 'c', tono: 'gris' },
    ])
  })

  it('`constructor` no está en ningún catálogo que no lo nombre', () => {
    expect(tonosQueYaNoEstan([{ grupo: 'compra', tono: 'constructor' }], ['verde'])).toEqual([
      { grupo: 'compra', tono: 'constructor' },
    ])
  })
})
