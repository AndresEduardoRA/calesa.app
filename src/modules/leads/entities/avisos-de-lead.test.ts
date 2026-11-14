import { describe, expect, it } from 'vitest'
import { accionesDelEnvio, esCausaDeBloqueoDeLead, VER_LOS_VEHICULOS } from './avisos-de-lead'

const ID = '0b1c2d3e-0000-4000-8000-000000000001'

describe('accionesDelEnvio', () => {
  it('un lead frenado por su vehículo vinculado ofrece ver sus vehículos', () => {
    const resueltas = accionesDelEnvio(
      { codigo: 'regla', mensaje: 'No se envió nada.', causa: 'vinculado' },
      [ID],
    )
    expect(resueltas.acciones).toEqual([
      { tipo: 'ir', etiqueta: VER_LOS_VEHICULOS, ruta: `/leads/${ID}?seccion=vehiculos` },
    ])
    expect(resueltas.pedido).toBeNull()
  })

  it('un vehículo que no ve, un lote o un error sin causa no ofrecen nada', () => {
    const regla = { codigo: 'regla' as const, mensaje: 'No.' }
    expect(accionesDelEnvio({ ...regla, causa: 'vinculado_ajeno' }, [ID]).acciones).toEqual([])
    expect(accionesDelEnvio({ ...regla, causa: 'vinculado' }, [ID, ID]).acciones).toEqual([])
    expect(accionesDelEnvio(regla, [ID]).acciones).toEqual([])
  })

  it('reconoce sólo las causas de la base', () => {
    expect(esCausaDeBloqueoDeLead('portal')).toBe(true)
    expect(esCausaDeBloqueoDeLead('nombre')).toBe(false)
  })
})
