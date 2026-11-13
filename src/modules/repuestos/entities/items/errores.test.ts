import { describe, expect, it } from 'vitest'
import { MENSAJE_DE_CANTIDAD, MENSAJE_DE_PRECIO } from './celda'
import { rechazoDeCelda, rechazoDeItem } from './errores'

describe('rechazoDeItem', () => {
  it('el hint de la base nombra la columna de la hoja y conserva el texto', () => {
    expect(
      rechazoDeItem({
        code: '22023',
        message: 'Escribe qué repuesto es (hasta 500 caracteres).',
        hint: 'descripcion',
      }),
    ).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'Escribe qué repuesto es (hasta 500 caracteres).' },
      porCampo: { descripcion: 'Escribe qué repuesto es (hasta 500 caracteres).' },
    })
  })

  it('«en uso» conserva el motivo que escribió la base', () => {
    const r = rechazoDeItem({
      code: '23514',
      message: 'Ya pasó por otra fase. Pásalo a stock o márcalo perdido.',
      hint: 'en_uso',
    })
    expect(r).toMatchObject({
      ok: false,
      error: {
        codigo: 'regla',
        mensaje: 'Ya pasó por otra fase. Pásalo a stock o márcalo perdido.',
      },
    })
  })

  it('PT409 es un conflicto', () => {
    expect(
      rechazoDeItem({ code: 'PT409', message: 'Otra persona cambió este ítem.' }),
    ).toMatchObject({
      ok: false,
      error: { codigo: 'conflicto' },
    })
  })

  it('un error desconocido no se muestra técnico', () => {
    expect(rechazoDeItem({ code: 'XX000', message: 'boom' })).toMatchObject({
      error: { codigo: 'inesperado' },
    })
  })
})

describe('rechazoDeCelda', () => {
  it('el check de cantidad y el rango del precio se dicen por columna', () => {
    expect(
      rechazoDeCelda('cantidad', {
        code: '23514',
        message: 'violates check constraint "repuestos_items_cantidad_check"',
      }),
    ).toMatchObject({ error: { mensaje: MENSAJE_DE_CANTIDAD } })
    expect(
      rechazoDeCelda('precio_cliente', { code: '22003', message: 'numeric field overflow' }),
    ).toMatchObject({
      error: { mensaje: MENSAJE_DE_PRECIO },
    })
  })

  it('lo que rechaza el trigger trae hint y conserva su texto', () => {
    expect(
      rechazoDeCelda('cantidad', {
        code: '23514',
        message: 'Ya pasaron 2 de este ítem a stock: la cantidad no puede ser menor.',
        hint: 'cantidad',
      }),
    ).toEqual({
      ok: false,
      error: {
        codigo: 'regla',
        mensaje: 'Ya pasaron 2 de este ítem a stock: la cantidad no puede ser menor.',
      },
      porCampo: { cantidad: 'Ya pasaron 2 de este ítem a stock: la cantidad no puede ser menor.' },
    })
    expect(
      rechazoDeCelda('cantidad', {
        code: '23514',
        message: 'El proyecto está cerrado: reábrelo para cambiar los ítems.',
        hint: 'proyecto',
      }),
    ).toEqual({
      ok: false,
      error: {
        codigo: 'regla',
        mensaje: 'El proyecto está cerrado: reábrelo para cambiar los ítems.',
      },
    })
  })
})
