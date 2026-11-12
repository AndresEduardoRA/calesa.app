import { describe, expect, it } from 'vitest'
import { rechazoDeCompra } from './errores'

describe('lo que la base rechaza al escribir una compra', () => {
  it('el hint `monto` va junto al campo del monto', () => {
    expect(
      rechazoDeCompra({
        code: '22023',
        message: 'El monto lleva como mucho dos decimales.',
        hint: 'monto',
      }),
    ).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'El monto lleva como mucho dos decimales.' },
      porCampo: { monto: 'El monto lleva como mucho dos decimales.' },
    })
  })

  it('el hint `item_id` va al campo `itemId` del formulario', () => {
    const r = rechazoDeCompra({
      code: '22023',
      message: 'Ese ítem no es de este proyecto.',
      hint: 'item_id',
    })
    expect(r.ok === false && r.porCampo).toEqual({ itemId: 'Ese ítem no es de este proyecto.' })
  })

  it('PT409 sin hint es un conflicto, sin campo', () => {
    expect(
      rechazoDeCompra({
        code: 'PT409',
        message: 'Otra persona cambió esta compra. Recarga para ver lo nuevo.',
      }),
    ).toEqual({
      ok: false,
      error: {
        codigo: 'conflicto',
        mensaje: 'Otra persona cambió esta compra. Recarga para ver lo nuevo.',
      },
    })
  })

  it('el proyecto cerrado (23514, hint `proyecto`) va arriba, sin campo', () => {
    const r = rechazoDeCompra({
      code: '23514',
      message: 'El proyecto está cerrado: reábrelo para registrar compras.',
      hint: 'proyecto',
    })
    expect(r).toEqual({
      ok: false,
      error: {
        codigo: 'regla',
        mensaje: 'El proyecto está cerrado: reábrelo para registrar compras.',
      },
    })
  })
})
