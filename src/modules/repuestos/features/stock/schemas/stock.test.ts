import { describe, expect, it } from 'vitest'
import { MENSAJE_DE_CANTIDAD_DE_STOCK, MENSAJE_DE_NOTA_LARGA } from '../../../entities/stock/reglas'
import { esquemaLeerMovimientos, esquemaMoverStock, esquemaReasignarStock } from './stock'

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

describe('leer movimientos: lo que cruza al servidor', () => {
  it('el cursor es un id positivo o nulo', () => {
    expect(esquemaLeerMovimientos.safeParse({ itemId: ITEM, cursor: null }).success).toBe(true)
    expect(esquemaLeerMovimientos.safeParse({ itemId: ITEM, cursor: 81 }).success).toBe(true)
    expect(esquemaLeerMovimientos.safeParse({ itemId: ITEM, cursor: 0 }).success).toBe(false)
    expect(esquemaLeerMovimientos.safeParse({ itemId: 'no', cursor: null }).success).toBe(false)
  })
})

const DESTINO = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
const NUEVO = '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e'
const reasignar = { itemId: ITEM, proyectoDestinoId: DESTINO, unidades: 1, id: NUEVO }
const mensajesDeReasignar = (valor: unknown) => {
  const leido = esquemaReasignarStock.safeParse(valor)
  return leido.success ? [] : leido.error.issues.map((i) => i.message)
}

describe('reasignar stock: lo que cruza al servidor', () => {
  it('uno válido pasa', () => {
    expect(esquemaReasignarStock.parse(reasignar)).toEqual(reasignar)
  })

  it('la cantidad es un entero desde 1', () => {
    for (const unidades of [0, -1, 1.5, null]) {
      expect(mensajesDeReasignar({ ...reasignar, unidades })).toContain(
        MENSAJE_DE_CANTIDAD_DE_STOCK,
      )
    }
  })

  it('sin proyecto destino lo pide', () => {
    for (const proyectoDestinoId of ['', 'no', null]) {
      expect(mensajesDeReasignar({ ...reasignar, proyectoDestinoId })).toContain(
        'Elige el proyecto destino.',
      )
    }
  })

  it('el ítem y el id del ítem nuevo son uuid', () => {
    expect(esquemaReasignarStock.safeParse({ ...reasignar, id: 'no' }).success).toBe(false)
    expect(esquemaReasignarStock.safeParse({ ...reasignar, itemId: 'no' }).success).toBe(false)
  })
})
