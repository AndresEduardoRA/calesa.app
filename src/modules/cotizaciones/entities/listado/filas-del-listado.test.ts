import { describe, expect, it } from 'vitest'
import type { FilaDelListado } from './listado'
import { filasConNombres, idsDe } from './filas-del-listado'

const L1 = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const V1 = '1c8b3a1f-2d3e-4f60-9bac-1d2e3f4a5b6c'
const P1 = '2d9c4b20-3e4f-4071-8cbd-2e3f4a5b6c7d'
const P2 = '3eadc531-4f50-4182-9dce-3f4a5b6c7d8e'

function fila(id: string, resto: Partial<FilaDelListado> = {}): FilaDelListado {
  return {
    id,
    numero: 1,
    origenId: 'o',
    leadId: null,
    vehiculoId: null,
    creadoPor: P1,
    clase: 'preventa',
    estado: 'activa',
    titulo: null,
    totalBase: 10,
    monedaMostrar: null,
    creadoEn: '2026-11-05T10:00:00+00:00',
    venceEl: '2026-11-12',
    vencida: false,
    ...resto,
  }
}

describe('idsDe', () => {
  it('da los ids distintos y sin nulos, en el orden en que aparecen', () => {
    const filas = [
      fila('a', { leadId: L1 }),
      fila('b', { leadId: null }),
      fila('c', { leadId: L1 }),
      fila('d', { leadId: V1 }),
    ]
    expect(idsDe(filas, 'leadId')).toEqual([L1, V1])
    expect(idsDe(filas, 'vehiculoId')).toEqual([])
    expect(idsDe(filas, 'creadoPor')).toEqual([P1])
  })

  it('una página vacía no tiene ids (no hay nada que consultar)', () => {
    expect(idsDe([], 'leadId')).toEqual([])
  })
})

describe('filasConNombres', () => {
  const nombres = {
    clientes: new Map([[L1, 'Carla Núñez']]),
    vehiculos: new Map([[V1, 'Toyota Hilux 2020']]),
    autores: new Map([[P1, 'Ana']]),
  }

  it('suma el cliente, el vehículo y el autor, y conserva el orden de la página', () => {
    const filas = [fila('b', { leadId: L1, vehiculoId: V1 }), fila('a')]
    const salida = filasConNombres(filas, nombres)
    expect(salida.map((f) => f.id)).toEqual(['b', 'a'])
    expect(salida[0]).toMatchObject({
      cliente: 'Carla Núñez',
      vehiculo: 'Toyota Hilux 2020',
      autor: 'Ana',
    })
  })

  it('lo que no llega (sin lead, o uno que quien mira no ve) es nulo: no se distinguen', () => {
    const salida = filasConNombres([fila('a', { leadId: V1, vehiculoId: L1 }), fila('b')], nombres)
    expect(salida[0]).toMatchObject({ cliente: null, vehiculo: null })
    expect(salida[1]).toMatchObject({ cliente: null, vehiculo: null })
  })

  it('un autor que no llegó se llama «Sin nombre»', () => {
    expect(filasConNombres([fila('a', { creadoPor: P2 })], nombres)[0]?.autor).toBe('Sin nombre')
  })
})
