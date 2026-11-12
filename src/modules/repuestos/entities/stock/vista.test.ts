import { describe, expect, it } from 'vitest'
import { esVistaDeStock, rutaDelStockDelItem, vehiculoDelStock } from './vista'

const ID = '7f9c1d2e-3a4b-4c5d-8e6f-0123456789ab'
const PROYECTO = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'

describe('la vista «Stock» de /repuestos', () => {
  it('sólo `stock` elige la vista; lo demás es «Proyectos»', () => {
    expect(esVistaDeStock('stock')).toBe(true)
    for (const otro of [null, undefined, '', 'proyectos', 'STOCK']) {
      expect(esVistaDeStock(otro)).toBe(false)
    }
  })

  it('la fila abre el ítem en la hoja de su proyecto con su panel de stock', () => {
    expect(rutaDelStockDelItem({ id: ID, proyectoId: PROYECTO })).toBe(
      `/repuestos/${PROYECTO}?panel=stock&item=${ID}`,
    )
  })

  it('el vehículo: título, el que no se ve, o el externo con su etiqueta', () => {
    const base = { vehiculoId: ID, vehiculoTitulo: 'Hilux 2019', vehiculoEtiqueta: null }
    expect(vehiculoDelStock(base)).toBe('Hilux 2019')
    expect(vehiculoDelStock({ ...base, vehiculoTitulo: null })).toBe('Vehículo que no puedes ver')
    expect(
      vehiculoDelStock({ vehiculoId: null, vehiculoTitulo: null, vehiculoEtiqueta: 'Moto' }),
    ).toBe('Externo · Moto')
    expect(
      vehiculoDelStock({ vehiculoId: null, vehiculoTitulo: null, vehiculoEtiqueta: null }),
    ).toBe('Externo')
  })
})
