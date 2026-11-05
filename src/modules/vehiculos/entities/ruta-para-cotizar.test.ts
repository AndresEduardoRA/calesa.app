import { describe, expect, it } from 'vitest'
import { rutaParaCotizar } from './ruta-para-cotizar'

const ID = '00000000-0000-4000-8000-000000000007'

describe('rutaParaCotizar: la hoja de cotizar con este vehículo', () => {
  it('agrega el vehículo en la clave que dice la página y conserva el origen', () => {
    expect(
      rutaParaCotizar({ ruta: '/cotizaciones/nuevo?origen=o1', claveDelVehiculo: 'vehiculo' }, ID),
    ).toBe(`/cotizaciones/nuevo?origen=o1&vehiculo=${ID}`)
  })

  it('no toca lo demás de la ruta y escribe la clave que se le dio', () => {
    expect(
      rutaParaCotizar(
        { ruta: '/cotizaciones/nuevo?origen=o%201&lead=l', claveDelVehiculo: 'v' },
        ID,
      ),
    ).toBe(`/cotizaciones/nuevo?origen=o+1&lead=l&v=${ID}`)
  })

  it('una ruta sin parámetros los empieza', () => {
    expect(rutaParaCotizar({ ruta: '/cotizaciones/nuevo', claveDelVehiculo: 'vehiculo' }, ID)).toBe(
      `/cotizaciones/nuevo?vehiculo=${ID}`,
    )
  })
})
