import { describe, expect, it, vi } from 'vitest'
import { fallo, ok } from '@/shared/lib/errores'
import { datosDelVehiculoDeLaHoja, leerOpcionesCon, opcionesDelDato } from './dato-del-vehiculo'
import type { CeldaDeHoja, HojaLista, ItemDeHoja } from './hoja'
import { hojaDePrueba } from './hoja-de-prueba.soporte'
import type { TablaDeAyuda } from './tabla-de-ayuda'

const base = hojaDePrueba()
const celdas = base.secciones
  .flatMap((s) => s.items)
  .filter((i): i is CeldaDeHoja => i.tipo === 'celda')
const primera = celdas[0]
const seccion = base.secciones[0]
if (!primera || !seccion) {
  throw new Error('La hoja de prueba no tiene celdas')
}
const celdaCon = (nodo: string, tabla: string, campos: [string, string][]): ItemDeHoja => ({
  ...primera,
  nodo,
  datoDelVehiculo: { tabla, columnas: campos.map(([columna, campo]) => ({ columna, campo })) },
})
const hojaCon = (...secciones: ItemDeHoja[][]): Pick<HojaLista, 'secciones'> => ({
  secciones: secciones.map((items, n) => ({
    ...seccion,
    id: `s${String(n)}`,
    items,
  })),
})

describe('datosDelVehiculoDeLaHoja: qué datos del vehículo casan con una tabla de la hoja', () => {
  it('dos celdas con el mismo campo y dos tablas dan un dato con las dos tablas, en el orden de la hoja', () => {
    const hoja = hojaCon(
      [celdaCon('t_bo', 'transporte_usa_bolivia', [['tipo', 'tipo_vehiculo']]), primera],
      [
        celdaCon('t_cl', 'transporte_usa_chile', [['tipo', 'tipo_vehiculo']]),
        celdaCon('flete', 'fletes', [
          ['tamano', 'tamano'],
          ['tipo', 'tipo_vehiculo'],
        ]),
      ],
    )
    expect(datosDelVehiculoDeLaHoja(hoja)).toEqual([
      {
        campo: 'tipo_vehiculo',
        tablas: [
          { tabla: 'transporte_usa_bolivia', columna: 'tipo' },
          { tabla: 'transporte_usa_chile', columna: 'tipo' },
          { tabla: 'fletes', columna: 'tipo' },
        ],
      },
      { campo: 'tamano', tablas: [{ tabla: 'fletes', columna: 'tamano' }] },
    ])
  })

  it('una tabla repetida (dos celdas de la misma tabla) no se repite', () => {
    const hoja = hojaCon([
      celdaCon('a', 'transporte_usa_bolivia', [['tipo', 'tipo_vehiculo']]),
      celdaCon('b', 'transporte_usa_bolivia', [['tipo', 'tipo_vehiculo']]),
    ])
    expect(datosDelVehiculoDeLaHoja(hoja)).toEqual([
      { campo: 'tipo_vehiculo', tablas: [{ tabla: 'transporte_usa_bolivia', columna: 'tipo' }] },
    ])
  })

  it('sin celdas con dato del vehículo, ninguno (también la columna fija viaja: qué se elige lo decide el panel)', () => {
    expect(datosDelVehiculoDeLaHoja(base)).toEqual([])
    expect(
      datosDelVehiculoDeLaHoja(hojaCon([celdaCon('a', 'por_anio', [['anio', 'anio']])])),
    ).toEqual([{ campo: 'anio', tablas: [{ tabla: 'por_anio', columna: 'anio' }] }])
  })
})

const tabla = (
  clave: string,
  filas: Record<string, unknown>[],
  extra: Partial<TablaDeAyuda> = {},
): TablaDeAyuda => ({
  clave,
  nombre: clave,
  columnas: [{ clave: 'tipo', etiqueta: 'Tipo de vehículo', tipo: 'texto' }],
  filas,
  hayMas: false,
  ...extra,
})

describe('opcionesDelDato: las filas de las tablas como opciones', () => {
  it('junta los textos en orden de tabla y de fila, sin repetir, con la etiqueta de la primera que la declara', () => {
    const r = opcionesDelDato([
      {
        tabla: tabla('bo', [{ tipo: 'autos' }, { tipo: 'motos' }], { columnas: [] }),
        columna: 'tipo',
      },
      { tabla: tabla('cl', [{ tipo: 'motos' }, { tipo: 'utv' }]), columna: 'tipo' },
    ])
    expect(r).toEqual({
      etiqueta: 'Tipo de vehículo',
      opciones: ['autos', 'motos', 'utv'],
      hayMas: false,
    })
  })

  it('sólo un texto no vacío cuenta: un número, nulo, vacío, booleano u objeto quedan fuera', () => {
    const r = opcionesDelDato([
      {
        tabla: tabla('bo', [
          { tipo: 3 },
          { tipo: null },
          { tipo: '' },
          { tipo: '  ' },
          { tipo: true },
          { tipo: { a: 1 } },
          {},
          { tipo: 'autos' },
        ]),
        columna: 'tipo',
      },
    ])
    expect(r.opciones).toEqual(['autos'])
  })

  it('sin columna declarada no hay etiqueta; `hayMas` si alguna lo dice; sin filas, ninguna opción', () => {
    expect(
      opcionesDelDato([
        { tabla: tabla('bo', [], { columnas: [] }), columna: 'tipo' },
        { tabla: tabla('cl', [], { columnas: [], hayMas: true }), columna: 'tipo' },
      ]),
    ).toEqual({ etiqueta: null, opciones: [], hayMas: true })
  })
})

describe('leerOpcionesCon: lee cada tabla una vez, en paralelo', () => {
  it('pide cada tabla distinta una sola vez y junta sus opciones', async () => {
    const leer = vi.fn((clave: string) =>
      Promise.resolve(ok(tabla(clave, [{ tipo: `de_${clave}` }]))),
    )
    const r = await leerOpcionesCon(leer, [
      { tabla: 'bo', columna: 'tipo' },
      { tabla: 'cl', columna: 'tipo' },
      { tabla: 'bo', columna: 'tipo' },
    ])
    expect(leer.mock.calls.map(([clave]) => clave)).toEqual(['bo', 'cl'])
    expect(r).toEqual(
      ok({ etiqueta: 'Tipo de vehículo', opciones: ['de_bo', 'de_cl'], hayMas: false }),
    )
  })

  it('una tabla que falla hace fallar la lectura', async () => {
    const leer = (clave: string) =>
      Promise.resolve(
        clave === 'cl' ? fallo('inesperado', 'sin red') : ok(tabla(clave, [{ tipo: 'autos' }])),
      )
    const r = await leerOpcionesCon(leer, [
      { tabla: 'bo', columna: 'tipo' },
      { tabla: 'cl', columna: 'tipo' },
    ])
    expect(r.ok).toBe(false)
  })
})
