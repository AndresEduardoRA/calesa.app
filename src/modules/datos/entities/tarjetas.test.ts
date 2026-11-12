import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Concesion, Permisos } from '@/shared/lib/permisos'
import { MOTIVOS, tarjetasDeExportar } from './tarjetas'

const A = { id: '3f0c9a43-6a2e-4c43-9b1a-0b6d1c2e8f10', nombre: 'Origen A' }
const B = { id: '7b2d4e1f-0c3a-4b5d-8e6f-1a2b3c4d5e6f', nombre: 'Origen B' }

function con(...concesiones: [clave: ClavePermiso, origenId?: string | null][]): Permisos {
  return concesiones.map(([clave, origenId = null]): Concesion => ({
    clave,
    origenId,
    alcance: 'todos',
  }))
}

describe('tarjetasDeExportar', () => {
  it('sin datos.exportar.todo no hay «Todo», y «Mis leads» sin leads.exportar va apagada con su motivo', () => {
    const tarjetas = tarjetasDeExportar(con(['leads.ver']), [A, B])
    expect(tarjetas.todo).toBeNull()
    expect(tarjetas.misLeads).toEqual({ habilitada: false, motivo: MOTIVOS.noExportaLeads })
  })

  it('«Mis leads» va prendida con leads.ver y leads.exportar; sin leads.ver dice que no ve leads', () => {
    expect(tarjetasDeExportar(con(['leads.ver'], ['leads.exportar']), null).misLeads).toEqual({
      habilitada: true,
    })
    expect(tarjetasDeExportar(con(['leads.exportar']), null).misLeads).toEqual({
      habilitada: false,
      motivo: MOTIVOS.noVeLeads,
    })
  })

  it('vehículos ofrece sólo los orígenes donde los ve; con la concesión en todos, todos (en el orden recibido)', () => {
    const soloA = tarjetasDeExportar(con(['datos.exportar.todo'], ['vehiculos.ver', A.id]), [
      A,
      B,
    ]).todo
    expect(soloA?.vehiculos).toEqual({ habilitada: true, origenes: [A] })
    const todos = tarjetasDeExportar(con(['datos.exportar.todo'], ['vehiculos.ver']), [B, A]).todo
    expect(todos?.vehiculos).toEqual({ habilitada: true, origenes: [B, A] })
  })

  it('con el permiso de exportar todo, la entidad que el rol no ve va apagada con su motivo', () => {
    const todo = tarjetasDeExportar(con(['datos.exportar.todo']), [A, B]).todo
    expect(todo?.leads).toEqual({ habilitada: false, motivo: MOTIVOS.noVeLeads })
    expect(todo?.vehiculos).toEqual({ habilitada: false, motivo: MOTIVOS.noVeVehiculos })
    expect(todo?.cotizaciones).toEqual({ habilitada: false, motivo: MOTIVOS.noVeCotizaciones })
  })

  it('cotizaciones ofrece los orígenes donde las ve y se prende con verlas en alguno', () => {
    const todo = tarjetasDeExportar(
      con(['datos.exportar.todo'], ['leads.ver'], ['cotizaciones.ver', B.id]),
      [A, B],
    ).todo
    expect(todo?.leads).toEqual({ habilitada: true })
    expect(todo?.cotizaciones).toEqual({ habilitada: true, origenes: [B] })
  })

  it('si no se pudieron leer los orígenes: vehículos da error y cotizaciones sigue, sin elegir origen', () => {
    const todo = tarjetasDeExportar(
      con(['datos.exportar.todo'], ['vehiculos.ver'], ['cotizaciones.ver']),
      null,
    ).todo
    expect(todo?.vehiculos).toEqual({ habilitada: false, error: 'origenes' })
    expect(todo?.cotizaciones).toEqual({ habilitada: true, origenes: [] })
  })
})
