import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { motivoParaNoImportar } from './permiso-de-importar'

const YO = '11111111-1111-4111-8111-111111111111'
const OTRA = '22222222-2222-4222-8222-222222222222'
const ORIGEN = '33333333-3333-4333-8333-333333333333'
const OTRO_ORIGEN = '44444444-4444-4444-8444-444444444444'

const con = (...concesiones: [string, string | null][]) =>
  concesiones.map(([clave, origenId]) => ({ clave, origenId })) as unknown as Permisos

const leads = (asignarA: string | null) => ({ entidad: 'leads' as const, asignarA, origenId: null })

describe('motivoParaNoImportar', () => {
  it('leads para sí: alcanza con leads.crear', () => {
    expect(motivoParaNoImportar(con(['leads.crear', null]), YO, leads(null))).toBeNull()
    expect(motivoParaNoImportar(con(['leads.crear', null]), YO, leads(YO))).toBeNull()
    expect(motivoParaNoImportar(con(), YO, leads(null))).toBe('No tienes permiso para crear leads.')
  })

  it('leads para otra persona: hace falta datos.importar.todo', () => {
    expect(motivoParaNoImportar(con(['leads.crear', null]), YO, leads(OTRA))).toBe(
      'No tienes permiso para importar leads para otra persona.',
    )
    expect(motivoParaNoImportar(con(['datos.importar.todo', null]), YO, leads(OTRA))).toBeNull()
  })

  it('vehículos: vehiculos.crear de ese origen', () => {
    const vehiculos = (origenId: string | null) => ({
      entidad: 'vehiculos' as const,
      asignarA: null,
      origenId,
    })
    expect(motivoParaNoImportar(con(['vehiculos.crear', ORIGEN]), YO, vehiculos(ORIGEN))).toBeNull()
    expect(motivoParaNoImportar(con(['vehiculos.crear', null]), YO, vehiculos(ORIGEN))).toBeNull()
    expect(motivoParaNoImportar(con(['vehiculos.crear', OTRO_ORIGEN]), YO, vehiculos(ORIGEN))).toBe(
      'No tienes permiso para crear vehículos en ese origen.',
    )
    expect(motivoParaNoImportar(con(['vehiculos.crear', ORIGEN]), YO, vehiculos(null))).toBe(
      'No tienes permiso para crear vehículos en ese origen.',
    )
  })
})
