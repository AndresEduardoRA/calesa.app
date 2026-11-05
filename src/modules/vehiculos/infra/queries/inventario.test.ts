// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { definicionSql } from '../../../../../scripts/lib/definicion-sql'
import type { Condicion } from '../../entities/filtros'
import { MAXIMO_DE_PAGINA_DE_VEHICULOS } from '../../entities/vehiculo'

vi.mock('server-only', () => ({}))

// Un cliente falso que anota la RPC que se llama y devuelve lo que se le diga.
const llamadas: [string, unknown][] = []
let respuesta: { data: unknown; error: unknown } = { data: [], error: null }
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      rpc: (nombre: string, argumentos: unknown) => {
        llamadas.push([nombre, argumentos])
        return Promise.resolve(respuesta)
      },
    }),
  ),
}))

import { FILTROS_RECHAZADOS, leerPorLaFuncion } from './inventario'

const ORIGEN = '00000000-0000-4000-8000-0000000000aa'
// Un instante con microsegundos: pasarlo por `Date` lo dejaría en milisegundos y la página siguiente repetiría o saltearía filas.
const INSTANTE = '2026-03-01T12:00:00.123456+00:00'

const fila = (i: number, extra: Record<string, unknown> = {}) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  numero: 100 + i,
  origen_id: ORIGEN,
  titulo: `Vehículo ${String(i)}`,
  marca: null,
  modelo: null,
  anio: null,
  vin: null,
  lote: null,
  plataforma: null,
  url_origen: null,
  precio: null,
  precio_negociable: null,
  acepta_permuta: null,
  placado: null,
  kilometraje: null,
  categoria_id: null,
  fase_id: null,
  atributos: {},
  lead_id: null,
  publicado_web: false,
  destacado_web: false,
  precio_web: null,
  precio_web_hasta: null,
  precio_web_nota: null,
  limpieza_el: null,
  portada_ruta: null,
  creado_por: null,
  creado_en: `2026-03-01T12:00:${String(59 - i).padStart(2, '0')}.000001+00:00`,
  actualizado_en: '2026-03-01T12:00:00.000001+00:00',
  ...extra,
})

const CONDICIONES: Condicion[] = [
  { tipo: 'busqueda', texto: 'toyota' },
  { tipo: 'columna_rango', columna: 'anio', min: 2020, max: null },
]

beforeEach(() => {
  llamadas.length = 0
  respuesta = { data: [], error: null }
})

describe('leerPorLaFuncion: lo que le pide a la base', () => {
  it('sin cursor: una sola llamada a vehiculos_inventario, con los seis argumentos', async () => {
    await leerPorLaFuncion({ origenId: ORIGEN, condiciones: [], cursor: null, tamano: 25 })
    expect(llamadas).toHaveLength(1)
    expect(llamadas[0]?.[0]).toBe('vehiculos_inventario')
    expect(llamadas[0]?.[1]).toEqual({
      p_origen: ORIGEN,
      p_tamano: 25,
      p_filtros: [],
      p_cursor_en: undefined,
      p_cursor_id: undefined,
      p_hacia_atras: false,
    })
  })

  it('con cursor siguiente: el instante va como texto, sin perder los microsegundos', async () => {
    await leerPorLaFuncion({
      origenId: ORIGEN,
      condiciones: CONDICIONES,
      cursor: { instante: INSTANTE, id: ORIGEN, sentido: 'siguiente' },
      tamano: 10,
    })
    expect(llamadas[0]?.[1]).toEqual({
      p_origen: ORIGEN,
      p_tamano: 10,
      p_filtros: CONDICIONES,
      p_cursor_en: INSTANTE,
      p_cursor_id: ORIGEN,
      p_hacia_atras: false,
    })
  })

  it('con cursor anterior: hacia atrás', async () => {
    await leerPorLaFuncion({
      origenId: ORIGEN,
      condiciones: [],
      cursor: { instante: INSTANTE, id: ORIGEN, sentido: 'anterior' },
      tamano: 10,
    })
    expect((llamadas[0]?.[1] as Record<string, unknown>)['p_hacia_atras']).toBe(true)
  })

  it('un pedido que no vale no llega a la base', async () => {
    const pedidos = [
      { origenId: 'uno', condiciones: [], cursor: null, tamano: 10 },
      { origenId: ORIGEN, condiciones: [], cursor: null, tamano: 0 },
      {
        origenId: ORIGEN,
        condiciones: [],
        cursor: null,
        tamano: MAXIMO_DE_PAGINA_DE_VEHICULOS + 1,
      },
      {
        origenId: ORIGEN,
        condiciones: [],
        cursor: { instante: INSTANTE, id: 'dos', sentido: 'siguiente' as const },
        tamano: 10,
      },
    ]
    for (const pedido of pedidos) {
      const r = await leerPorLaFuncion(pedido)
      expect(r === FILTROS_RECHAZADOS, JSON.stringify(pedido)).toBe(false)
      if (r !== FILTROS_RECHAZADOS) {
        expect(r.ok, JSON.stringify(pedido)).toBe(false)
        if (!r.ok) expect(r.error.codigo).toBe('validacion')
      }
    }
    expect(llamadas).toEqual([])
  })
})

describe('leerPorLaFuncion: lo que devuelve', () => {
  it('con una fila de más hay siguiente; con las justas, no', async () => {
    respuesta = { data: [fila(1), fila(2), fila(3)], error: null }
    const con = await leerPorLaFuncion({
      origenId: ORIGEN,
      condiciones: [],
      cursor: null,
      tamano: 2,
    })
    if (con === FILTROS_RECHAZADOS || !con.ok) throw new Error('debía leer')
    expect(con.data.filas.map((f) => f.numero)).toEqual([101, 102])
    expect(con.data.siguiente).not.toBeNull()
    expect(con.data.anterior).toBeNull()

    respuesta = { data: [fila(1), fila(2)], error: null }
    const sin = await leerPorLaFuncion({
      origenId: ORIGEN,
      condiciones: [],
      cursor: null,
      tamano: 2,
    })
    if (sin === FILTROS_RECHAZADOS || !sin.ok) throw new Error('debía leer')
    expect(sin.data.siguiente).toBeNull()
  })

  it('hacia atrás la base devuelve lo más viejo primero y la página sale dada vuelta', async () => {
    respuesta = { data: [fila(3), fila(2), fila(1)], error: null }
    const r = await leerPorLaFuncion({
      origenId: ORIGEN,
      condiciones: [],
      cursor: { instante: INSTANTE, id: ORIGEN, sentido: 'anterior' },
      tamano: 2,
    })
    if (r === FILTROS_RECHAZADOS || !r.ok) throw new Error('debía leer')
    expect(r.data.filas.map((f) => f.numero)).toEqual([102, 103])
    expect(r.data.siguiente).not.toBeNull()
    expect(r.data.anterior).not.toBeNull()
  })

  it('la portada llega como portadaRuta', async () => {
    respuesta = { data: [fila(1, { portada_ruta: 'a/b.webp' })], error: null }
    const r = await leerPorLaFuncion({ origenId: ORIGEN, condiciones: [], cursor: null, tamano: 5 })
    if (r === FILTROS_RECHAZADOS || !r.ok) throw new Error('debía leer')
    expect(r.data.filas[0]?.portadaRuta).toBe('a/b.webp')
  })

  it('filas que no valen: «inesperado», sin romper', async () => {
    respuesta = { data: [{ id: 'no' }], error: null }
    const r = await leerPorLaFuncion({ origenId: ORIGEN, condiciones: [], cursor: null, tamano: 5 })
    if (r === FILTROS_RECHAZADOS || r.ok) throw new Error('debía fallar')
    expect(r.error.codigo).toBe('inesperado')
  })
})

describe('leerPorLaFuncion: los errores de la base', () => {
  it('22023 con la pista «filtros»: el marcador para que quien llama lea de la tabla', async () => {
    respuesta = {
      data: null,
      error: {
        code: '22023',
        hint: 'filtros',
        message: 'Los filtros del inventario no son válidos.',
      },
    }
    const r = await leerPorLaFuncion({
      origenId: ORIGEN,
      condiciones: CONDICIONES,
      cursor: null,
      tamano: 10,
    })
    expect(r).toBe(FILTROS_RECHAZADOS)
    expect(llamadas).toHaveLength(1)
  })

  it('22023 con otra pista (origen, cursor): es el error, no el marcador', async () => {
    for (const hint of ['origen', 'cursor']) {
      respuesta = { data: null, error: { code: '22023', hint, message: 'Revisa el pedido.' } }
      const r = await leerPorLaFuncion({
        origenId: ORIGEN,
        condiciones: [],
        cursor: null,
        tamano: 10,
      })
      expect(r === FILTROS_RECHAZADOS, hint).toBe(false)
    }
  })

  it('otro error: el de siempre', async () => {
    respuesta = { data: null, error: { code: '42501', message: 'permission denied' } }
    const r = await leerPorLaFuncion({
      origenId: ORIGEN,
      condiciones: [],
      cursor: null,
      tamano: 10,
    })
    if (r === FILTROS_RECHAZADOS || r.ok) throw new Error('debía fallar')
    expect(r.error.codigo).toBe('sin_permiso')
  })
})

// El contrato entre las condiciones de la app y las de la base (C4 del 4.16-2b): un tipo de `Condicion` que la base no conoce haría
// que la base rechace los filtros y la pantalla leyera siempre por la tabla, sin que nada falle (la vuelta lo esconde).
// `satisfies Record<…>` rompe el `typecheck` si se suma un tipo y no está acá; las dos pruebas piden que la lista sea la de los
// `when '<tipo>' then` de la definición vigente de cada función SQL.
const TIPOS = {
  busqueda: true,
  columna_en: true,
  columna_rango: true,
  en_vitrina: true,
  por_limpiar: true,
  atributos_contienen: true,
  atributo_rango_numero: true,
  atributo_rango_texto: true,
  atributo_texto: true,
} satisfies Record<Condicion['tipo'], true>

// Los tipos de los `when '<tipo>' then` de un trozo de la definición de la base: desde `desde` hasta `hasta` (el final, si no hay).
function tiposDe(sql: string, desde: string, hasta?: string): string[] {
  const inicio = sql.lastIndexOf(desde)
  expect(inicio, `no hay «${desde}»`).toBeGreaterThanOrEqual(0)
  const fin = hasta === undefined ? sql.length : sql.indexOf(hasta, inicio)
  expect(fin, `no hay «${hasta ?? ''}»`).toBeGreaterThan(inicio)
  return [...sql.slice(inicio, fin).matchAll(/when '([a-z_]+)' then/g)].map((m) => m[1] ?? '')
}

describe('las condiciones de la app y las de la base', () => {
  const esperados = Object.keys(TIPOS).sort()

  it('_vehiculos_inventario_validar acepta los mismos tipos que Condicion', () => {
    expect(
      tiposDe(
        definicionSql('_vehiculos_inventario_validar').texto,
        'v_ok := case v_t',
        'else false end',
      ).sort(),
    ).toEqual(esperados)
  })

  it('_vehiculos_inventario_condicion arma los mismos tipos que Condicion', () => {
    expect(
      tiposDe(
        definicionSql('_vehiculos_inventario_condicion').texto,
        'case p_tipo\n    when',
      ).sort(),
    ).toEqual(esperados)
  })
})
