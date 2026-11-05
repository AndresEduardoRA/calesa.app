import { describe, expect, it } from 'vitest'
import { argumentosDeGuardar, type PedidoDeEdicion } from './pedido-de-edicion'

const COTIZACION = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const INTENTO = '1b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const VEHICULO = '2b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
// El texto de la base, con sus microsegundos: un `Date` de JS los pierde y la versión daría siempre conflicto.
const VERSION = '2026-11-03T14:20:31.123456+00:00'

const pedido = (mas: Partial<PedidoDeEdicion> = {}): PedidoDeEdicion => ({
  intento: INTENTO,
  cotizacionId: COTIZACION,
  actualizadoEn: VERSION,
  entradas: { inputs: { pub: 5 }, banderas: {}, overrides: {} },
  modoTc: null,
  verTotalBs: false,
  titulo: null,
  notas: null,
  vehiculoId: null,
  ...mas,
})

describe('argumentosDeGuardar', () => {
  it('manda las nueve claves de cotizacion_guardar, siempre, también con nulos', () => {
    expect(argumentosDeGuardar(pedido())).toEqual({
      p_id: COTIZACION,
      p_intento: INTENTO,
      p_actualizado_en_esperado: VERSION,
      p_entradas: { inputs: { pub: 5 }, banderas: {}, overrides: {} },
      p_modo_tc: null,
      p_titulo: null,
      p_notas: null,
      p_vehiculo: null,
      p_ver_total_bs: false,
    })
  })

  it('la versión esperada es el texto recibido, idéntico, con sus microsegundos', () => {
    expect(argumentosDeGuardar(pedido()).p_actualizado_en_esperado).toBe(VERSION)
    expect(argumentosDeGuardar(pedido()).p_actualizado_en_esperado).not.toBe(
      new Date(VERSION).toISOString(),
    )
  })

  it('título, notas y vehículo son los de la cotización, sin tocarlos; el modo y «Ver total Bs», los de la hoja', () => {
    const a = argumentosDeGuardar(
      pedido({
        titulo: 'Una camioneta',
        notas: 'Con flete',
        vehiculoId: VEHICULO,
        modoTc: 'paralelo',
        verTotalBs: true,
      }),
    )
    expect(a).toMatchObject({
      p_titulo: 'Una camioneta',
      p_notas: 'Con flete',
      p_vehiculo: VEHICULO,
      p_modo_tc: 'paralelo',
      p_ver_total_bs: true,
    })
  })
})
