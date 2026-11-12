import { describe, expect, it } from 'vitest'
import {
  CANALES_DE_AFORO,
  declaracionDesde,
  esCanalDeAforo,
  filasDeDeclaracionDesde,
  textoDelCanal,
} from './declaracion'

const ID = '44444444-4444-4444-8444-444444444444'
const VEHICULO = '55555555-5555-4555-8555-555555555555'
const ORIGEN = '66666666-6666-4666-8666-666666666666'

const fila = {
  id: ID,
  numero: 'DUI-1',
  canal: 'verde',
  aceptada_el: '2026-11-01',
  vence_tributos_el: null,
  despachante: null,
  deposito: null,
  creado_en: '2026-11-10T10:00:00Z',
  actualizado_en: '2026-11-10T10:00:00Z',
  vehiculos: 2,
  hay_ocultos: false,
  pagada: false,
  faltan: 2,
}

describe('el canal de aforo', () => {
  it('sus valores y su texto salen de un solo lugar', () => {
    expect(CANALES_DE_AFORO.map(textoDelCanal)).toEqual(['Verde', 'Amarillo', 'Rojo'])
    expect(textoDelCanal(null)).toBe('Sin canal')
    expect(esCanalDeAforo('azul')).toBe(false)
  })
})

describe('lo que devuelve la base', () => {
  it('las filas de la lista se nombran en camelCase', () => {
    expect(filasDeDeclaracionDesde([fila])).toEqual([
      {
        id: ID,
        numero: 'DUI-1',
        canal: 'verde',
        aceptadaEl: '2026-11-01',
        venceTributosEl: null,
        despachante: null,
        deposito: null,
        creadoEn: '2026-11-10T10:00:00Z',
        actualizadoEn: '2026-11-10T10:00:00Z',
        vehiculos: 2,
        hayOcultos: false,
        pagada: false,
        faltan: 2,
      },
    ])
  })

  it('una fila con otra forma vuelve nulo y no se descarta en silencio', () => {
    expect(filasDeDeclaracionDesde([{ ...fila, id: 'x' }])).toBeNull()
    expect(filasDeDeclaracionDesde({})).toBeNull()
  })

  it('un canal que no se conoce queda sin canal', () => {
    expect(filasDeDeclaracionDesde([{ ...fila, canal: 'azul' }])?.[0]?.canal).toBeNull()
  })

  it('la declaración leída trae su versión, sus vehículos y si hay más', () => {
    const leida = declaracionDesde({
      ...fila,
      notas: 'n',
      hay_mas: true,
      vehiculos: [
        {
          vehiculo_id: VEHICULO,
          titulo: 'Toyota Hilux',
          origen_id: ORIGEN,
          fase_id: null,
          fase: null,
          agregado_en: '2026-11-10T10:00:00Z',
          tributo: true,
        },
      ],
    })
    expect(leida?.actualizadoEn).toBe('2026-11-10T10:00:00Z')
    expect(leida?.hayMas).toBe(true)
    expect(leida?.vehiculos).toEqual([
      {
        vehiculoId: VEHICULO,
        titulo: 'Toyota Hilux',
        origenId: ORIGEN,
        faseId: null,
        fase: null,
        agregadoEn: '2026-11-10T10:00:00Z',
        tributo: true,
      },
    ])
    expect(declaracionDesde({ ...fila, vehiculos: 2 })).toBeNull()
  })
})
