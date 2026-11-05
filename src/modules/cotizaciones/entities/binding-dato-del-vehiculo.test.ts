import { describe, expect, it } from 'vitest'
import { propsDeCelda, textoDelFaltante, type ContextoDeHoja } from './binding'
import { ENTRADAS_VACIAS, indiceDeHoja } from './entradas'
import type { CeldaDeHoja, DatoDelVehiculo } from './hoja'
import { hojaDePrueba, respuestaDePrueba } from './hoja-de-prueba.soporte'
import type { CodigoDeFaltante } from './motor-contexto'

// La celda sin valor por un dato del vehículo que se elige en el panel dice dónde se elige (4.14-2c3, C9).
const hoja = hojaDePrueba()
const indice = indiceDeHoja(hoja.secciones)
const fees = indice.celdas.get('fees')
if (!fees) {
  throw new Error('No hay la celda fees')
}
const TIPO: DatoDelVehiculo = {
  tabla: 'transporte',
  columnas: [{ columna: 'tipo', campo: 'tipo_vehiculo' }],
}
const ANIO: DatoDelVehiculo = { tabla: 'por_anio', columnas: [{ columna: 'anio', campo: 'anio' }] }
const celdaCon = (dato: DatoDelVehiculo | null): CeldaDeHoja => ({ ...fees, datoDelVehiculo: dato })
const error = (
  dato: DatoDelVehiculo | null,
  codigo: CodigoDeFaltante,
  seEligen?: ReadonlySet<string>,
) => {
  const c: ContextoDeHoja = {
    indice,
    entradas: ENTRADAS_VACIAS,
    respuesta: respuestaDePrueba({ faltantes: [{ codigo, donde: 'fees' }] }),
    ...(seEligen ? { seEligen } : {}),
  }
  return propsDeCelda(celdaCon(dato), c).error
}
const ELIGE = 'Elige el dato del vehículo en «Vehículo», arriba de la hoja, o escribe el valor.'
const SE_ELIGE = new Set(['tipo_vehiculo'])

describe('el faltante de una celda cuyo dato del vehículo se elige en el panel', () => {
  it.each(['fila_sin_coincidencia', 'campo_sin_valor'] as const)(
    '%s dice dónde se elige si el campo se elige',
    (codigo) => {
      expect(error(TIPO, codigo, SE_ELIGE)).toBe(ELIGE)
    },
  )

  it('una celda que sólo casa una columna fija, sin dato, o sin campos que se elijan dice lo de siempre', () => {
    for (const codigo of ['fila_sin_coincidencia', 'campo_sin_valor'] as const) {
      const deSiempre = textoDelFaltante(codigo)
      expect(error(ANIO, codigo, SE_ELIGE)).toBe(deSiempre)
      expect(error(null, codigo, SE_ELIGE)).toBe(deSiempre)
      expect(error(TIPO, codigo, new Set())).toBe(deSiempre)
      expect(error(TIPO, codigo)).toBe(deSiempre)
    }
  })

  it('una tabla sin filas no cambia', () => {
    expect(error(TIPO, 'tabla_sin_filas', SE_ELIGE)).toBe(textoDelFaltante('tabla_sin_filas'))
  })
})
