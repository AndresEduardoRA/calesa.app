import { describe, expect, it } from 'vitest'
import { leerElTerrenoSobre } from './consulta-del-terreno-de-prueba'
import {
  clienteSimulado,
  filasDe,
  ORIGEN,
  pidiendo,
  tablaDeRef,
  type Tabla,
} from './consulta-del-terreno-de-prueba.soporte'

describe('leerElTerrenoSobre con volumen (max_rows = 1.000)', () => {
  const leer = (tablas: Tabla[], filas: Tabla[], claves: string[]) => {
    const sim = clienteSimulado({ tablas_referencia: tablas, tablas_referencia_filas: filas })
    return leerElTerrenoSobre(sim.cliente, { origenId: ORIGEN, tablas: claves, cambios: [] }).then(
      (r) => ({ r, llamadas: pidiendo(sim.llamadas, 'tablas_referencia_filas') }),
    )
  }

  it('dos tablas de 600 se leen enteras en 2 pedidos de filas, la segunda sola', async () => {
    const { r, llamadas } = await leer(
      [tablaDeRef(1, 'a'), tablaDeRef(2, 'b')],
      [...filasDe(1, 600), ...filasDe(2, 600)],
      ['a', 'b'],
    )
    expect(r.ok && r.data.tablas['a']).toHaveLength(600)
    expect(r.ok && r.data.tablas['b']).toHaveLength(600)
    expect(r.ok && r.data.avisos).toEqual([])
    expect(llamadas).toHaveLength(2)
  })

  it('una de 999 filas se lee entera en un pedido', async () => {
    const { r, llamadas } = await leer([tablaDeRef(1, 'a')], filasDe(1, 999), ['a'])
    expect(r.ok && r.data.tablas['a']).toHaveLength(999)
    expect(llamadas).toHaveLength(1)
  })

  it('una de 1.000 y una de 1.001 quedan fuera con su aviso (PostgREST nunca da 1.001)', async () => {
    const mil = await leer([tablaDeRef(1, 'a')], filasDe(1, 1000), ['a'])
    expect(mil.r.ok && mil.r.data.tablas).toEqual({})
    expect(mil.r.ok && mil.r.data.avisos).toEqual([{ codigo: 'tabla_grande', clave: 'a' }])
    const milUna = await leer([tablaDeRef(1, 'a')], filasDe(1, 1001), ['a'])
    expect(milUna.r.ok && milUna.r.data.tablas).toEqual({})
    expect(milUna.r.ok && milUna.r.data.avisos).toEqual([{ codigo: 'tabla_grande', clave: 'a' }])
  })

  it('una de 1.001 y otra pequeña que ordena después: la pequeña se lee en el pedido siguiente, no vacía', async () => {
    const { r, llamadas } = await leer(
      [tablaDeRef(1, 'grande'), tablaDeRef(2, 'chica')],
      [...filasDe(1, 1001), ...filasDe(2, 3)],
      ['grande', 'chica'],
    )
    expect(r.ok && r.data.avisos).toEqual([{ codigo: 'tabla_grande', clave: 'grande' }])
    expect(r.ok && r.data.tablas['chica']).toHaveLength(3)
    expect(llamadas).toHaveLength(2)
  })

  it('más tablas grandes que pedidos: las pendientes se avisan «sin leer»', async () => {
    const n = 8
    const claves = Array.from({ length: n }, (_, i) => `t${String(i)}`)
    const tablas = claves.map((c, i) => tablaDeRef(i + 1, c))
    // Cada tabla ocupa 700 filas: cada página (1.000) acepta a lo más una, deja la siguiente pendiente.
    const filas = claves.flatMap((_, i) => filasDe(i + 1, 700))
    const { r, llamadas } = await leer(tablas, filas, claves)
    expect(llamadas).toHaveLength(6)
    const sinLeer = (r.ok ? r.data.avisos : []).filter((a) => a.codigo === 'tabla_sin_leer')
    expect(sinLeer.length).toBeGreaterThan(0)
    expect(r.ok && Object.keys(r.data.tablas).length + sinLeer.length).toBe(n)
  })

  it('una fila con otra forma deja esa tabla fuera, con su aviso', async () => {
    const malas = filasDe(1, 2).map((f) => ({ ...f, valores: { 'Clave Mala': 1 } }))
    const { r } = await leer([tablaDeRef(1, 'a')], malas, ['a'])
    expect(r.ok && r.data.tablas).toEqual({})
    expect(r.ok && r.data.avisos).toEqual([{ codigo: 'tabla_ilegible', clave: 'a' }])
  })

  it('más de 40 tablas: las 40 primeras y el aviso', async () => {
    const claves = Array.from({ length: 41 }, (_, i) => `t${String(i)}`)
    const { r } = await leer([], [], claves)
    expect(r.ok && r.data.avisos.at(-1)).toEqual({ codigo: 'mas_tablas' })
  })

  it('el error de una consulta es un fallo con texto propio', async () => {
    for (const tabla of ['tipos_cambio', 'tablas_referencia', 'tablas_referencia_filas']) {
      const { cliente } = clienteSimulado(
        { tablas_referencia: [tablaDeRef(1, 'a')], tablas_referencia_filas: filasDe(1, 1) },
        tabla,
      )
      const r = await leerElTerrenoSobre(cliente, {
        origenId: ORIGEN,
        tablas: ['a'],
        cambios: ['oficial'],
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.mensaje).not.toContain('XX000')
    }
  })
})
