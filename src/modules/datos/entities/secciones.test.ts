import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { MOTIVO_SIN_IMPORTAR, seccionDeDatos, seccionesDeDatos } from './secciones'

const ORIGEN = '33333333-3333-4333-8333-333333333333'

const con = (...concesiones: [string, string | null][]) =>
  concesiones.map(([clave, origenId]) => ({ clave, origenId })) as unknown as Permisos

describe('las secciones de /datos', () => {
  it('se ven las dos; «Importar» apagada con su motivo si no importas nada', () => {
    expect(seccionesDeDatos(con())).toEqual([
      { clave: 'exportar', titulo: 'Exportar' },
      { clave: 'importar', titulo: 'Importar', motivo: MOTIVO_SIN_IMPORTAR },
    ])
    for (const permiso of ['leads.crear', 'datos.importar.todo']) {
      expect(seccionesDeDatos(con([permiso, null]))[1]).toEqual({
        clave: 'importar',
        titulo: 'Importar',
      })
    }
    expect(seccionesDeDatos(con(['vehiculos.crear', ORIGEN]))[1]?.motivo).toBeUndefined()
  })

  it('«Importar» sólo se abre si se pide y se puede', () => {
    expect(seccionDeDatos('importar', con())).toBe('exportar')
    expect(seccionDeDatos('importar', con(['leads.crear', null]))).toBe('importar')
    expect(seccionDeDatos(undefined, con(['leads.crear', null]))).toBe('exportar')
    expect(seccionDeDatos('otra', con(['leads.crear', null]))).toBe('exportar')
    expect(seccionDeDatos('exportar', con())).toBe('exportar')
  })
})
