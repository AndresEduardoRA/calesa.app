import { describe, expect, it } from 'vitest'
import { leerFiltros } from '@/shared/lib/filtros'
import type { Concesion, Permisos } from '@/shared/lib/permisos'
import {
  CLAVE_DE_CLASE,
  CLAVE_DE_CUALES,
  esquemaDelListado,
  origenParaNueva,
  pedidoDelListado,
} from './filtros-del-listado'

const A = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const B = '1c8b3a1f-2d3e-4f60-9bac-1d2e3f4a5b6c'
const origenes = [
  { id: A, nombre: 'Subasta' },
  { id: B, nombre: 'Concesionario' },
]

const pedido = (parametros: Record<string, string>, visibles = origenes) =>
  pedidoDelListado(leerFiltros(esquemaDelListado(visibles), parametros), {
    cursor: null,
    tamano: 50,
  })

describe('esquemaDelListado', () => {
  it('trae Clase y Cuáles, y Origen sólo si hay dos o más para elegir', () => {
    const claves = (visibles: typeof origenes) =>
      esquemaDelListado(visibles).filtros.map((filtro) => filtro.clave)
    expect(claves(origenes)).toEqual(['origen', CLAVE_DE_CLASE, CLAVE_DE_CUALES])
    expect(claves([origenes[0]!])).toEqual([CLAVE_DE_CLASE, CLAVE_DE_CUALES])
  })

  it('no tiene búsqueda: la lectura no la tiene', () => {
    expect(esquemaDelListado(origenes).busqueda).toBeNull()
  })

  it('Origen lista a todos y a cada origen con su nombre; Clase y Cuáles empiezan en «Todas»', () => {
    const [origen, clase, cuales] = esquemaDelListado(origenes).filtros
    expect(origen?.tipo === 'eleccion' && origen.opciones.map((o) => o.etiqueta)).toEqual([
      'Todos',
      'Subasta',
      'Concesionario',
    ])
    expect(clase?.tipo === 'eleccion' && clase.opciones.map((o) => o.etiqueta)).toEqual([
      'Todas',
      'Preventa',
      'Final',
    ])
    expect(cuales?.tipo === 'eleccion' && cuales.opciones.map((o) => o.etiqueta)).toEqual([
      'Todas',
      'Mías',
    ])
  })
})

describe('pedidoDelListado', () => {
  it('sin nada en la URL no filtra: la primera página del tamaño pedido', () => {
    expect(pedido({})).toEqual({ cursor: null, tamano: 50 })
  })

  it('lee origen, clase y mías', () => {
    expect(pedido({ origen: B, clase: 'final', cuales: 'mias' })).toEqual({
      origenId: B,
      clase: 'final',
      mias: true,
      cursor: null,
      tamano: 50,
    })
  })

  it('lo que no corresponde se ignora, nunca falla', () => {
    expect(pedido({ origen: 'otro', clase: 'rara', cuales: 'todas' })).toEqual({
      cursor: null,
      tamano: 50,
    })
    // Un origen que quien mira no tiene entre sus opciones tampoco filtra.
    expect(pedido({ origen: '2d9c4b20-3e4f-4071-8cbd-2e3f4a5b6c7d' })).toEqual({
      cursor: null,
      tamano: 50,
    })
  })

  it('con un solo origen visible, ?origen= no filtra', () => {
    expect(pedido({ origen: A }, [origenes[0]!])).toEqual({ cursor: null, tamano: 50 })
  })

  it('lee el vehículo si es un guid y lo ignora si no', () => {
    const valores = leerFiltros(esquemaDelListado(origenes), {})
    const de = (vehiculo: string | undefined) =>
      pedidoDelListado(valores, { cursor: null, tamano: 50, vehiculo })
    expect(de(B)).toEqual({ vehiculoId: B, cursor: null, tamano: 50 })
    expect(de('no-es-un-guid')).toEqual({ cursor: null, tamano: 50 })
    expect(de(undefined)).toEqual({ cursor: null, tamano: 50 })
    expect(de('')).toEqual({ cursor: null, tamano: 50 })
  })

  it('conserva el cursor y el tamaño', () => {
    const cursor = {
      instante: '2026-11-05T10:00:00.123456+00:00',
      id: A,
      sentido: 'siguiente' as const,
    }
    expect(
      pedidoDelListado(leerFiltros(esquemaDelListado(origenes), {}), { cursor, tamano: 10 }),
    ).toEqual({ cursor, tamano: 10 })
  })
})

const concesiones = (...datos: [Concesion['clave'], string | null][]): Permisos =>
  datos.map(([clave, origenId]) => ({ clave, origenId, alcance: 'todos' }))

describe('origenParaNueva', () => {
  const activos = [
    { id: A, activo: true },
    { id: B, activo: true },
  ]
  const todo = concesiones(['cotizaciones.ver', null], ['cotizaciones.crear', null])

  it('el origen del filtro si se cotiza en él', () => {
    expect(origenParaNueva(todo, activos, B)).toBe(B)
  })

  it('si no hay filtro o no se cotiza en él, el primero donde se cotiza', () => {
    expect(origenParaNueva(todo, activos, undefined)).toBe(A)
    const soloB = concesiones(['cotizaciones.ver', null], ['cotizaciones.crear', B])
    expect(origenParaNueva(soloB, activos, A)).toBe(B)
  })

  it('un origen desactivado no se cotiza', () => {
    expect(
      origenParaNueva(
        todo,
        [
          { id: A, activo: false },
          { id: B, activo: true },
        ],
        A,
      ),
    ).toBe(B)
  })

  it('sin dónde cotizar, nulo', () => {
    expect(origenParaNueva(concesiones(['cotizaciones.ver', null]), activos, A)).toBeNull()
  })
})
