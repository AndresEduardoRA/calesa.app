import { describe, expect, it } from 'vitest'
import { esquemaAgregarImagenes, esquemaQuitarImagen } from './imagenes'

const ITEM = '7f9c1d2e-3a4b-4c5d-8e6f-0123456789ab'
const ruta = (c: string, item = ITEM) => `${item}/${c.repeat(64)}.webp`

describe('agregar imágenes', () => {
  it('acepta de 1 a 8 rutas del ítem', () => {
    expect(esquemaAgregarImagenes.safeParse({ itemId: ITEM, rutas: [ruta('a')] }).success).toBe(
      true,
    )
    const ocho = 'abcdef01'.split('').map((c) => ruta(c))
    expect(esquemaAgregarImagenes.safeParse({ itemId: ITEM, rutas: ocho }).success).toBe(true)
  })
  it('rechaza cero, nueve y una ruta de otro ítem o fuera del patrón', () => {
    const nueve = 'abcdef012'.split('').map((c) => ruta(c))
    expect(esquemaAgregarImagenes.safeParse({ itemId: ITEM, rutas: [] }).success).toBe(false)
    expect(esquemaAgregarImagenes.safeParse({ itemId: ITEM, rutas: nueve }).success).toBe(false)
    expect(
      esquemaAgregarImagenes.safeParse({
        itemId: ITEM,
        rutas: [ruta('a', '8f9c1d2e-3a4b-4c5d-8e6f-0123456789ab')],
      }).success,
    ).toBe(false)
    expect(
      esquemaAgregarImagenes.safeParse({ itemId: ITEM, rutas: [`${ITEM}/foto.webp`] }).success,
    ).toBe(false)
  })
  it('los ids van como guid', () => {
    expect(esquemaAgregarImagenes.safeParse({ itemId: 'x', rutas: [ruta('a')] }).success).toBe(
      false,
    )
    expect(esquemaQuitarImagen.safeParse({ imagenId: 'x' }).success).toBe(false)
    expect(esquemaQuitarImagen.safeParse({ imagenId: ITEM }).success).toBe(true)
  })
})
