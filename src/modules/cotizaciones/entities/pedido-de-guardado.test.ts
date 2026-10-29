import { describe, expect, it } from 'vitest'
import { argumentosDeCrear, type PedidoDeGuardado } from './pedido-de-guardado'

const PEDIDO: PedidoDeGuardado = {
  intento: 'i',
  origenId: 'o',
  leadId: 'l',
  vehiculoId: null,
  abierta: 'f.1.ab',
  entradas: { inputs: { pub: 1 }, banderas: {}, overrides: {} },
  modoTc: null,
  conLaAbierta: false,
}

describe('argumentosDeCrear', () => {
  it('los argumentos exactos de cotizacion_crear: preventa, sin vehículo si no hay', () => {
    expect(argumentosDeCrear(PEDIDO)).toEqual({
      p_id: 'i',
      p_origen: 'o',
      p_lead: 'l',
      p_entradas: { inputs: { pub: 1 }, banderas: {}, overrides: {} },
      p_abierta: 'f.1.ab',
      p_clase: 'preventa',
      p_con_la_abierta: false,
    })
  })

  it('con vehículo lo manda, y «Guardar con la N» va con la abierta', () => {
    const args = argumentosDeCrear({ ...PEDIDO, vehiculoId: 'v', conLaAbierta: true })
    expect(args.p_vehiculo).toBe('v')
    expect(args.p_con_la_abierta).toBe(true)
  })

  it('manda p_modo_tc con el modo y lo omite sin él', () => {
    expect(argumentosDeCrear({ ...PEDIDO, modoTc: 'unificado' }).p_modo_tc).toBe('unificado')
    expect('p_modo_tc' in argumentosDeCrear(PEDIDO)).toBe(false)
  })
})
