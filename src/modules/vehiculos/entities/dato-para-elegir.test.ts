import { describe, expect, it } from 'vitest'
import type { CampoDeVehiculo } from './campo'
import {
  datosParaElegirDe,
  marcadaDe,
  opcionesADibujar,
  TOPE_DE_OPCIONES,
} from './dato-para-elegir'

const campo = (clave: string, cambios: Partial<CampoDeVehiculo> = {}): CampoDeVehiculo => ({
  clave,
  etiqueta: clave,
  tipo: 'texto',
  opciones: [],
  requerido: false,
  grupo: null,
  enTarjeta: false,
  filtrable: false,
  activo: true,
  valorDefecto: null,
  ...cambios,
})
const CAMPOS = [
  campo('tipo_vehiculo'),
  campo('notas', { tipo: 'texto_largo' }),
  campo('viejo', { activo: false }),
  campo('color', { tipo: 'opcion' }),
  campo('peso', { tipo: 'numero' }),
]
const tablas = (tabla: string) => [{ tabla, columna: 'c' }]
const DATOS = [
  { campo: 'anio', tablas: tablas('por_anio') },
  { campo: 'tipo_vehiculo', tablas: tablas('transporte') },
  { campo: 'viejo', tablas: tablas('t2') },
  { campo: 'color', tablas: tablas('t3') },
  { campo: 'peso', tablas: tablas('t4') },
  { campo: 'notas', tablas: tablas('t5') },
]
const vehiculo = (atributos: Record<string, unknown>) => ({
  atributos,
  actualizadoEn: '2026-10-30T10:00:00.000001Z',
})

describe('datosParaElegirDe: qué datos del vehículo se eligen en el panel', () => {
  it('sólo un campo activo del layout de texto: ni una columna fija, ni uno inactivo, ni una opción, ni un número', () => {
    const r = datosParaElegirDe(vehiculo({ tipo_vehiculo: 'autos' }), DATOS, CAMPOS, true)
    expect(r).toEqual({
      version: '2026-10-30T10:00:00.000001Z',
      editable: true,
      datos: [
        { campo: 'tipo_vehiculo', valor: 'autos', tablas: tablas('transporte') },
        { campo: 'notas', valor: null, tablas: tablas('t5') },
      ],
    })
  })

  it('el valor sale del atributo sólo si es un texto: un número, una lista, un booleano o nada cuentan como sin valor', () => {
    for (const valor of [3, ['a'], true, undefined, null]) {
      const r = datosParaElegirDe(vehiculo({ tipo_vehiculo: valor }), DATOS, CAMPOS, false)
      expect(r?.datos[0]).toMatchObject({ campo: 'tipo_vehiculo', valor: null })
      expect(r?.editable).toBe(false)
    }
  })

  it('sin datos que se elijan, null (nada viaja ni se dibuja)', () => {
    expect(datosParaElegirDe(vehiculo({}), [], CAMPOS, true)).toBeNull()
    expect(datosParaElegirDe(vehiculo({}), DATOS.slice(0, 1), CAMPOS, true)).toBeNull()
  })
})

describe('marcadaDe: la opción que coincide con el dato del vehículo', () => {
  it('por igualdad estricta de textos, como el motor', () => {
    expect(marcadaDe('autos', ['autos', 'motos'])).toBe('autos')
    expect(marcadaDe('Autos', ['autos', 'motos'])).toBeNull()
    expect(marcadaDe('AUTOMOBILE', ['autos'])).toBeNull()
    expect(marcadaDe(null, ['autos'])).toBeNull()
  })
})

describe('opcionesADibujar: a lo sumo el tope, con la marcada siempre a la vista', () => {
  const muchas = Array.from({ length: 60 }, (_, i) => `op_${String(i).padStart(2, '0')}`)

  it('con pocas, todas y sin tope', () => {
    expect(opcionesADibujar(['a', 'b'], null, '')).toEqual({
      dibujadas: ['a', 'b'],
      hayMasQueElTope: false,
    })
  })

  it('con más del tope, dibuja el tope y lo dice', () => {
    const r = opcionesADibujar(muchas, null, '')
    expect(r.dibujadas).toHaveLength(TOPE_DE_OPCIONES)
    expect(r.hayMasQueElTope).toBe(true)
  })

  it('la marcada que queda fuera del tope va primera', () => {
    const r = opcionesADibujar(muchas, 'op_59', '')
    expect(r.dibujadas[0]).toBe('op_59')
    expect(r.dibujadas).toHaveLength(TOPE_DE_OPCIONES)
    expect(opcionesADibujar(muchas, 'op_03', '').dibujadas[3]).toBe('op_03')
  })

  it('buscar acota lo leído, sin distinguir mayúsculas', () => {
    expect(opcionesADibujar(muchas, null, 'P_5').dibujadas).toEqual(
      muchas.filter((o) => o.startsWith('op_5')),
    )
    expect(opcionesADibujar(muchas, null, ' op_57 ').dibujadas).toEqual(['op_57'])
  })
})
