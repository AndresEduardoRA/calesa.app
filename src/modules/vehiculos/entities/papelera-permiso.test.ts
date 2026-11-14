import { describe, expect, it } from 'vitest'
import { pedidoDe, SIN_ACCIONES } from '@/shared/lib/acciones-del-aviso'
import type { AlcanceDeAvisos } from './avisos-de-vehiculo'
import { bloqueoParaEnviar, papeleraDelVehiculo, permisoDePapelera } from './papelera-permiso'

const ID = (n: number) => `00000000-0000-0000-0000-00000000000${String(n)}`

describe('qué se sabe de antemano que no va', () => {
  it('lo vinculado dice su causa y su texto', () => {
    expect(bloqueoParaEnviar({ leadId: ID(1), faseId: null }, null)).toEqual({
      causa: 'vinculado',
      motivo: 'Está vinculado a un lead. Quita el vínculo antes.',
    })
  })

  it('lo que salió de su fase inicial dice su causa y su texto', () => {
    expect(
      bloqueoParaEnviar(
        { leadId: null, faseId: ID(2) },
        { nombre: 'En tránsito', esInicial: false },
      ),
    ).toEqual({
      causa: 'fase',
      motivo: 'Está en «En tránsito». Sólo va a la papelera lo que sigue en su fase inicial.',
    })
  })

  it('lo vinculado manda sobre la fase (el orden de la base)', () => {
    expect(
      bloqueoParaEnviar({ leadId: ID(1), faseId: ID(2) }, { nombre: 'X', esInicial: false })?.causa,
    ).toBe('vinculado')
  })

  it('en su fase inicial, o sin fase, nada lo frena', () => {
    expect(
      bloqueoParaEnviar({ leadId: null, faseId: ID(2) }, { nombre: 'Disponible', esInicial: true }),
    ).toBeNull()
    expect(bloqueoParaEnviar({ leadId: null, faseId: null }, null)).toBeNull()
  })
})

describe('permisoDePapelera', () => {
  const bloqueo = { causa: 'vinculado', motivo: 'Motivo.' } as const

  it('sin el permiso la acción no existe', () => {
    expect(permisoDePapelera(false, bloqueo)).toEqual({ estado: 'oculto' })
  })

  it('con un bloqueo se ve apagada, con su motivo y sus acciones', () => {
    const acciones = { acciones: [], pedido: pedidoDe('quitar el vínculo') }
    expect(permisoDePapelera(true, bloqueo, acciones)).toEqual({
      estado: 'deshabilitado',
      motivo: 'Motivo.',
      acciones,
    })
    expect(permisoDePapelera(true, bloqueo)).toEqual({
      estado: 'deshabilitado',
      motivo: 'Motivo.',
      acciones: SIN_ACCIONES,
    })
  })

  it('sin bloqueo se puede', () => {
    expect(permisoDePapelera(true, null)).toEqual({ estado: 'habilitado' })
  })
})

describe('papeleraDelVehiculo', () => {
  const alcance: AlcanceDeAvisos = {
    verLeads: true,
    verLogistica: true,
    verCotizaciones: true,
    verRepuestos: true,
  }
  const base = {
    eliminable: true,
    vehiculo: { id: 'v1', leadId: 'l1', faseId: null },
    fase: null,
    editable: true,
    leadVisible: true,
    alcance,
  }

  it('vinculado: apagada con su motivo y las dos acciones, la que destraba primero', () => {
    const permiso = papeleraDelVehiculo(base)
    expect(permiso.estado).toBe('deshabilitado')
    if (permiso.estado !== 'deshabilitado') return
    expect(permiso.motivo).toBe('Está vinculado a un lead. Quita el vínculo antes.')
    expect(permiso.acciones.acciones.map((a) => a.etiqueta)).toEqual([
      'Quitar el vínculo',
      'Ver el lead',
    ])
  })

  it('sin editar el vehículo, el pedido en vez del botón', () => {
    const permiso = papeleraDelVehiculo({ ...base, editable: false })
    if (permiso.estado !== 'deshabilitado') throw new Error('debía estar apagada')
    expect(permiso.acciones.pedido).toBe(pedidoDe('quitar el vínculo'))
  })

  it('sin permiso para enviar no existe, y sin bloqueo se puede', () => {
    expect(papeleraDelVehiculo({ ...base, eliminable: false })).toEqual({ estado: 'oculto' })
    expect(
      papeleraDelVehiculo({ ...base, vehiculo: { id: 'v1', leadId: null, faseId: null } }),
    ).toEqual({ estado: 'habilitado' })
  })

  it('fuera de su fase inicial ofrece verlo en logística', () => {
    const permiso = papeleraDelVehiculo({
      ...base,
      vehiculo: { id: 'v1', leadId: null, faseId: 'f1' },
      fase: { nombre: 'En tránsito', esInicial: false },
    })
    if (permiso.estado !== 'deshabilitado') throw new Error('debía estar apagada')
    expect(permiso.acciones.acciones.map((a) => a.etiqueta)).toEqual(['Ver en logística'])
  })
})
