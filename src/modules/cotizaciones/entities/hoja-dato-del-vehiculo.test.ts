import { describe, expect, it } from 'vitest'
import { hojaDesde, type HojaLista } from './hoja'
import { lista } from './hoja.soporte'

// La celda de un nodo `tabla` dice qué columna de su tabla casa con qué dato del vehículo (4.14-2c2); la pantalla lo usa en el 4.14-2c3.
const conDato = (dato: unknown) => {
  const h = lista()
  const items = h.secciones[0]?.items ?? []
  return {
    ...h,
    secciones: [
      {
        ...h.secciones[0],
        items: items.map((i, n) => (n === 2 ? { ...i, dato_del_vehiculo: dato } : i)),
      },
    ],
  }
}
const celda = (h: unknown) => {
  const item = (hojaDesde(h) as HojaLista).secciones[0]?.items[2]
  return item?.tipo === 'celda' ? item : null
}

describe('hojaDesde: el dato del vehículo de una celda de tabla', () => {
  it('lee el dato del vehículo de una celda de tabla y lo pasa a camelCase', () => {
    const dato = {
      tabla: 'transporte_usa_bolivia',
      columnas: [{ columna: 'tipo', campo: 'tipo_vehiculo' }],
    }
    expect(celda(conDato(dato))?.datoDelVehiculo).toEqual(dato)
  })

  it('sin dato, datoDelVehiculo es null', () => {
    expect(celda(lista())?.datoDelVehiculo).toBeNull()
  })

  it('rechaza lo que la base no promete', () => {
    const casos: Record<string, unknown> = {
      'sin columnas': { tabla: 'transporte', columnas: [] },
      'un campo que no es la clave de un campo': {
        tabla: 'transporte',
        columnas: [{ columna: 'tipo', campo: 'Tipo' }],
      },
      'una tabla que no es un id': { tabla: 'X-1', columnas: [{ columna: 'tipo', campo: 'tipo' }] },
      'una columna vacía': { tabla: 'transporte', columnas: [{ columna: '', campo: 'tipo' }] },
    }
    for (const [caso, dato] of Object.entries(casos)) {
      expect(hojaDesde(conDato(dato)), caso).toBeNull()
    }
  })
})
