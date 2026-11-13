import { describe, expect, it } from 'vitest'
import { itemAbiertoDe } from './paneles'

const ID = '11111111-1111-4111-8111-111111111111'

describe('el ítem abierto en la URL', () => {
  it('?item=<guid> lo abre', () => {
    expect(itemAbiertoDe({ item: ID })).toBe(ID)
  })

  it('con ?panel= (stock, imágenes o cualquiera) manda el panel de siempre', () => {
    expect(itemAbiertoDe({ item: ID, panel: 'stock' })).toBeNull()
    expect(itemAbiertoDe({ item: ID, panel: 'imagenes' })).toBeNull()
    expect(itemAbiertoDe({ item: ID, panel: '' })).toBeNull()
  })

  it('un valor que no es guid, vacío, repetido o ausente no abre nada', () => {
    expect(itemAbiertoDe({ item: 'hola' })).toBeNull()
    expect(itemAbiertoDe({ item: '' })).toBeNull()
    expect(itemAbiertoDe({ item: [ID, ID] })).toBeNull()
    expect(itemAbiertoDe({})).toBeNull()
  })
})
