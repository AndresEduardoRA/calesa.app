import { describe, expect, it } from 'vitest'
import type { CotizacionDelListado } from './filas-del-listado'
import {
  CLAVE_DE_RESUMEN_DE_COTIZACION,
  idDelResumen,
  idSiguiente,
  MENSAJE_DE_COTIZACION_NO_DISPONIBLE,
  UNA,
  vistaDelResumen,
} from './resumen-del-listado'

const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const OTRO = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'

const cotizacion = (id: string): CotizacionDelListado => ({
  id,
  numero: 7,
  origenId: '00000000-0000-4000-8000-0000000000aa',
  leadId: null,
  vehiculoId: null,
  creadoPor: '00000000-0000-4000-8000-0000000000bb',
  clase: 'preventa',
  estado: 'activa',
  titulo: null,
  totalBase: 100,
  monedaMostrar: null,
  creadoEn: '2026-03-01T12:00:00.123456+00:00',
  venceEl: '2026-04-01',
  vencida: false,
  cliente: null,
  vehiculo: null,
  autor: 'Ana',
})

describe('constantes', () => {
  it('la clave de la URL y el tamaño de la búsqueda de una', () => {
    expect(CLAVE_DE_RESUMEN_DE_COTIZACION).toBe('cotizacion')
    expect(UNA).toBe(1)
    expect(MENSAJE_DE_COTIZACION_NO_DISPONIBLE).toBe(
      'Esta cotización ya no está disponible: no existe o ya no tienes acceso.',
    )
  })
})

describe('idDelResumen', () => {
  it('un guid sale en minúsculas', () => {
    expect(idDelResumen(ID)).toBe(ID)
    expect(idDelResumen(ID.toUpperCase())).toBe(ID)
  })

  it('lo que no es un guid, vacío o nulo da null', () => {
    expect(idDelResumen('abc')).toBeNull()
    expect(idDelResumen('')).toBeNull()
    expect(idDelResumen(null)).toBeNull()
    expect(idDelResumen(undefined)).toBeNull()
    expect(idDelResumen(`${ID}x`)).toBeNull()
  })
})

describe('idSiguiente', () => {
  it('suma uno al último dígito', () => {
    expect(idSiguiente('00000000-0000-4000-8000-000000000000')).toBe(
      '00000000-0000-4000-8000-000000000001',
    )
    expect(idSiguiente('00000000-0000-4000-8000-00000000000f')).toBe(
      '00000000-0000-4000-8000-000000000010',
    )
  })

  it('el acarreo cruza un guion', () => {
    expect(idSiguiente('00000000-0000-4000-0000-ffffffffffff')).toBe(
      '00000000-0000-4000-0001-000000000000',
    )
    expect(idSiguiente('00000000-0000-ffff-ffff-ffffffffffff')).toBe(
      '00000000-0001-0000-0000-000000000000',
    )
  })

  it('con mayúsculas sale en minúsculas', () => {
    expect(idSiguiente('ABCDEF00-0000-4000-8000-0000000000AF')).toBe(
      'abcdef00-0000-4000-8000-0000000000b0',
    )
  })

  it('el máximo y lo que no es un guid dan null', () => {
    expect(idSiguiente('ffffffff-ffff-ffff-ffff-ffffffffffff')).toBeNull()
    expect(idSiguiente('abc')).toBeNull()
  })
})

describe('vistaDelResumen', () => {
  const base = { filas: [], delServidor: null, yaPedido: false }

  it('sin clave, cerrado', () => {
    expect(vistaDelResumen({ ...base, texto: null })).toEqual({ tipo: 'cerrado' })
  })

  it('un id que no es guid, no disponible', () => {
    expect(vistaDelResumen({ ...base, texto: 'abc' })).toEqual({ tipo: 'no_disponible' })
    expect(vistaDelResumen({ ...base, texto: '' })).toEqual({ tipo: 'no_disponible' })
  })

  it('un id entre las filas de la página muestra esa fila', () => {
    const fila = cotizacion(ID)
    expect(vistaDelResumen({ ...base, texto: ID, filas: [cotizacion(OTRO), fila] })).toEqual({
      tipo: 'cotizacion',
      cotizacion: fila,
    })
  })

  it('un id con mayúsculas encuentra su fila', () => {
    const fila = cotizacion(ID)
    expect(vistaDelResumen({ ...base, texto: ID.toUpperCase(), filas: [fila] })).toEqual({
      tipo: 'cotizacion',
      cotizacion: fila,
    })
  })

  it('la fila de la página gana sobre lo que leyó el servidor', () => {
    const fila = cotizacion(ID)
    const delServidor = { id: ID, estado: 'no_disponible' as const }
    expect(vistaDelResumen({ ...base, texto: ID, filas: [fila], delServidor })).toEqual({
      tipo: 'cotizacion',
      cotizacion: fila,
    })
  })

  it('si no está en la página, lo que leyó el servidor de ese id', () => {
    const leida = cotizacion(ID)
    expect(
      vistaDelResumen({
        ...base,
        texto: ID.toUpperCase(),
        delServidor: { id: ID, estado: 'listo', cotizacion: leida },
      }),
    ).toEqual({ tipo: 'cotizacion', cotizacion: leida })
    expect(
      vistaDelResumen({ ...base, texto: ID, delServidor: { id: ID, estado: 'no_disponible' } }),
    ).toEqual({ tipo: 'no_disponible' })
    expect(
      vistaDelResumen({ ...base, texto: ID, delServidor: { id: ID, estado: 'error' } }),
    ).toEqual({ tipo: 'error' })
  })

  it('la lectura del servidor de otro id no vale: cargando y, ya pedido, error', () => {
    const delServidor = { id: OTRO, estado: 'listo' as const, cotizacion: cotizacion(OTRO) }
    expect(vistaDelResumen({ ...base, texto: ID, delServidor })).toEqual({ tipo: 'cargando' })
    expect(vistaDelResumen({ ...base, texto: ID, delServidor, yaPedido: true })).toEqual({
      tipo: 'error',
    })
  })

  it('sin lectura: cargando y, ya pedido y sin lectura de ese id, error', () => {
    expect(vistaDelResumen({ ...base, texto: ID })).toEqual({ tipo: 'cargando' })
    expect(vistaDelResumen({ ...base, texto: ID, yaPedido: true })).toEqual({ tipo: 'error' })
  })
})
