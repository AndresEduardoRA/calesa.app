import { describe, expect, it } from 'vitest'
import { avisosDeTonos } from './avisos-de-tonos'

const etiqueta = (g: string) => (g === 'compra' ? 'Compra' : g)

describe('avisosDeTonos', () => {
  it('un tono ausente da su aviso con el grupo y el tono', () => {
    expect(avisosDeTonos([{ grupo: 'compra', tono: 'rojo' }], ['verde'], etiqueta)).toEqual([
      'El tono «rojo» del grupo «Compra» ya no está en el catálogo: la tarjeta usa el tono del grupo. Elige otro o «Del grupo».',
    ])
  })
  it('sin tono elegido o con uno que está, nada', () => {
    expect(
      avisosDeTonos([{ grupo: 'a' }, { grupo: 'b', tono: 'verde' }], ['verde'], etiqueta),
    ).toEqual([])
  })
  it('un tono `constructor` no se halla en el prototipo', () => {
    expect(avisosDeTonos([{ grupo: 'a', tono: 'constructor' }], ['verde'], etiqueta)).toHaveLength(
      1,
    )
  })
})
