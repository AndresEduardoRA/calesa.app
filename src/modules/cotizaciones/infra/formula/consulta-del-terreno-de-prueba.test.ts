import { describe, expect, it } from 'vitest'
import { FILAS_POR_PAGINA } from '../../entities/formula/terreno-de-prueba'
import { leerElTerrenoSobre } from './consulta-del-terreno-de-prueba'
import {
  clienteSimulado,
  filasDe,
  ORIGEN,
  pidiendo,
  tablaDeRef,
} from './consulta-del-terreno-de-prueba.soporte'

describe('leerElTerrenoSobre', () => {
  it('pide cada cosa con sus filtros, su orden y su tope, sin select(*) ni conteo', async () => {
    const { cliente, llamadas } = clienteSimulado({
      tipos_cambio: [{ clave: 'oficial', valor: 6.96, moneda_a: 'BOB', activo: true }],
      tablas_referencia: [tablaDeRef(1, 'dep', ORIGEN)],
      tablas_referencia_filas: filasDe(1, 3),
    })
    const r = await leerElTerrenoSobre(cliente, {
      origenId: ORIGEN,
      tablas: ['dep'],
      cambios: ['oficial'],
    })
    expect(r.ok && r.data.tipos_cambio).toEqual({ oficial: 6.96 })
    expect(r.ok && r.data.monedas).toEqual({ oficial: 'BOB' })
    expect(r.ok && r.data.tablas['dep']).toHaveLength(3)
    const tipos = pidiendo(llamadas, 'tipos_cambio')[0]
    expect(tipos).toMatchObject({ columnas: 'clave, valor, moneda_a', limite: 100 })
    expect(tipos?.filtros).toEqual(['in:clave', 'eq:activo'])
    const tablas = pidiendo(llamadas, 'tablas_referencia')[0]
    expect(tablas?.columnas).toBe('id, origen_id, clave, activa')
    expect(tablas?.limite).toBe(80)
    expect(tablas?.filtros).toEqual([
      'in:clave',
      `or:origen_id.eq.${ORIGEN},origen_id.is.null`,
      'eq:activa',
    ])
    const filas = pidiendo(llamadas, 'tablas_referencia_filas')[0]
    expect(filas?.columnas).toBe('tabla_id, valores')
    expect(filas?.limite).toBe(FILAS_POR_PAGINA)
    expect(filas?.filtros).toEqual(['in:tabla_id', 'eq:activa'])
    for (const l of llamadas) expect(l.columnas).not.toContain('*')
  })

  it('sin tablas vivas no pide tablas; sin nodos de cambio no pide tipos', async () => {
    const a = clienteSimulado({})
    expect(
      (await leerElTerrenoSobre(a.cliente, { origenId: ORIGEN, tablas: [], cambios: [] })).ok,
    ).toBe(true)
    expect(a.llamadas).toHaveLength(0)
    const b = clienteSimulado({ tablas_referencia: [], tablas_referencia_filas: [] })
    await leerElTerrenoSobre(b.cliente, { origenId: ORIGEN, tablas: ['dep'], cambios: [] })
    expect(pidiendo(b.llamadas, 'tipos_cambio')).toHaveLength(0)
    expect(pidiendo(b.llamadas, 'tablas_referencia_filas')).toHaveLength(0)
  })

  it('una tabla ausente o un tipo de cambio inactivo se avisan', async () => {
    const { cliente } = clienteSimulado({
      tipos_cambio: [{ clave: 'oficial', valor: 6.96, moneda_a: 'BOB', activo: false }],
      tablas_referencia: [],
    })
    const r = await leerElTerrenoSobre(cliente, {
      origenId: ORIGEN,
      tablas: ['dep'],
      cambios: ['oficial'],
    })
    expect(r.ok && r.data.avisos).toEqual([
      { codigo: 'cambio_ausente', clave: 'oficial' },
      { codigo: 'tabla_ausente', clave: 'dep' },
    ])
  })

  it('la del origen gana a la compartida', async () => {
    const { cliente } = clienteSimulado({
      tablas_referencia: [tablaDeRef(1, 'dep'), tablaDeRef(2, 'dep', ORIGEN)],
      tablas_referencia_filas: [...filasDe(1, 1), ...filasDe(2, 2)],
    })
    const r = await leerElTerrenoSobre(cliente, { origenId: ORIGEN, tablas: ['dep'], cambios: [] })
    expect(r.ok && r.data.tablas['dep']).toHaveLength(2)
  })
})
