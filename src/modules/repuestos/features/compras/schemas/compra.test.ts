import { describe, expect, it } from 'vitest'
import { esquemaEliminarCompra, esquemaGuardarCompra } from './compra'

const ID = '0b7f2c1e-4a8d-4f6b-9c3e-2d1a5b6c7d8e'
const PROYECTO = '5e4d3c2b-1a09-4f8e-8d7c-6b5a49382716'
const VERSION = '2026-11-12T16:00:00.123+00:00'

const pedido = (datos: Record<string, unknown>, actualizadoEnEsperado: string | null = null) => ({
  id: ID,
  proyectoId: PROYECTO,
  actualizadoEnEsperado,
  datos,
})

describe('lo que cruza al guardar una compra', () => {
  it('rechaza `monto_base` y `proyecto_id`: el equivalente lo pone la base y la compra no cambia de proyecto', () => {
    expect(esquemaGuardarCompra.safeParse(pedido({ monto: 15, monto_base: 15 })).success).toBe(
      false,
    )
    expect(esquemaGuardarCompra.safeParse(pedido({ proyecto_id: PROYECTO })).success).toBe(false)
  })

  it('acepta la esperada nula (crear) y sólo las claves que cambiaron', () => {
    expect(esquemaGuardarCompra.safeParse(pedido({ moneda: 'USD', monto: 0 })).success).toBe(true)
    expect(esquemaGuardarCompra.safeParse(pedido({ monto: 20 }, VERSION)).success).toBe(true)
  })

  it('rechaza un id que no es guid y una ruta de comprobante fuera de la forma', () => {
    expect(esquemaGuardarCompra.safeParse({ ...pedido({}), id: 'x' }).success).toBe(false)
    expect(
      esquemaGuardarCompra.safeParse(pedido({ comprobante_ruta: '../otro/archivo.pdf' })).success,
    ).toBe(false)
    expect(
      esquemaGuardarCompra.safeParse(
        pedido({ comprobante_ruta: `${PROYECTO}/${'a'.repeat(64)}.pdf` }),
      ).success,
    ).toBe(true)
  })

  it('eliminar pide la versión: con la esperada nula no pasa', () => {
    expect(
      esquemaEliminarCompra.safeParse({ id: ID, proyectoId: PROYECTO, actualizadoEnEsperado: null })
        .success,
    ).toBe(false)
    expect(
      esquemaEliminarCompra.safeParse({
        id: ID,
        proyectoId: PROYECTO,
        actualizadoEnEsperado: VERSION,
      }).success,
    ).toBe(true)
  })
})
