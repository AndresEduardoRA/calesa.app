import { describe, expect, it } from 'vitest'
import { MENSAJE_DE_CANTIDAD_DE_STOCK, MENSAJE_DE_NOTA_LARGA } from '../../../entities/stock/reglas'
import { esquemaMoverStock } from './stock'

const ITEM = '7f9c1d2e-3a4b-4c5d-8e6f-0123456789ab'
const valido = { itemId: ITEM, motivo: 'sobrante', unidades: 2, stockEsperado: 0, nota: null }
const mensajes = (valor: unknown) => {
  const leido = esquemaMoverStock.safeParse(valor)
  return leido.success ? [] : leido.error.issues.map((i) => i.message)
}

describe('mover stock: lo que cruza al servidor', () => {
  it('acepta pasar a stock, vender suelto y devolver', () => {
    for (const motivo of ['sobrante', 'vendido', 'devuelto']) {
      expect(esquemaMoverStock.safeParse({ ...valido, motivo }).success).toBe(true)
    }
  })

  it('rechaza el ajuste, el reasignado y lo que no es un motivo', () => {
    for (const motivo of ['ajuste', 'reasignado', 'otro']) {
      expect(esquemaMoverStock.safeParse({ ...valido, motivo }).success).toBe(false)
    }
  })

  it('la cantidad es un entero desde 1', () => {
    for (const unidades of [0, -1, 1.5, null]) {
      expect(mensajes({ ...valido, unidades })).toContain(MENSAJE_DE_CANTIDAD_DE_STOCK)
    }
  })

  it('el stock que se vio no es negativo', () => {
    expect(esquemaMoverStock.safeParse({ ...valido, stockEsperado: -1 }).success).toBe(false)
  })

  it('la nota se recorta, en blanco es nula y admite hasta 500', () => {
    expect(esquemaMoverStock.parse({ ...valido, nota: '   ' }).nota).toBeNull()
    expect(esquemaMoverStock.parse({ ...valido, nota: ' Sobró ' }).nota).toBe('Sobró')
    expect(mensajes({ ...valido, nota: `${'a'.repeat(501)}  ` })).toContain(MENSAJE_DE_NOTA_LARGA)
    expect(esquemaMoverStock.safeParse({ ...valido, nota: 'a'.repeat(500) }).success).toBe(true)
  })

  it('el ítem es un uuid', () => {
    expect(esquemaMoverStock.safeParse({ ...valido, itemId: 'no' }).success).toBe(false)
  })
})
