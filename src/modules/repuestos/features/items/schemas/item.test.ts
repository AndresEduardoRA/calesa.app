import { describe, expect, it } from 'vitest'
import { esquemaCrearItem, esquemaEliminarItem } from './item'

const ID = '7f9c1d2e-3a4b-4c5d-8e6f-0123456789ab'

describe('esquemas de ítem', () => {
  it('crear acepta la descripción sola o con cantidad y precio', () => {
    expect(
      esquemaCrearItem.safeParse({ id: ID, proyectoId: ID, descripcion: 'Faro' }).success,
    ).toBe(true)
    expect(
      esquemaCrearItem.safeParse({
        id: ID,
        proyectoId: ID,
        descripcion: 'Faro',
        cantidad: 2,
        precioCliente: 5,
        moneda: 'USD',
      }).success,
    ).toBe(true)
  })
  it('crear y eliminar rechazan ids que no son guid', () => {
    expect(esquemaCrearItem.safeParse({ id: '1', proyectoId: ID, descripcion: 'x' }).success).toBe(
      false,
    )
    expect(esquemaEliminarItem.safeParse({ id: '1', actualizadoEn: 'x' }).success).toBe(false)
    expect(esquemaEliminarItem.safeParse({ id: ID, actualizadoEn: '' }).success).toBe(false)
  })
})
