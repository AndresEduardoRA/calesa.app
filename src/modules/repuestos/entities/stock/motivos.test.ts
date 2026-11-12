import { describe, expect, it } from 'vitest'
import {
  MOTIVOS_CON_BOTON,
  MOTIVOS_DE_STOCK,
  MOTIVOS_POR_MOVER,
  TEXTO_DEL_MOTIVO,
  esMotivoDeStock,
  esMotivoPorMover,
  sentidoDe,
} from './motivos'

describe('motivos de stock', () => {
  it('sólo sobrante entra; el resto sale', () => {
    expect(MOTIVOS_DE_STOCK.filter((m) => sentidoDe(m) === 'entrada')).toEqual(['sobrante'])
  })

  it('mover acepta todos menos reasignado y sólo vender y devolver tienen botón', () => {
    expect(MOTIVOS_POR_MOVER).toEqual(MOTIVOS_DE_STOCK.filter((m) => m !== 'reasignado'))
    expect(MOTIVOS_CON_BOTON).toEqual(['vendido', 'devuelto'])
    expect(esMotivoPorMover('reasignado')).toBe(false)
    expect(esMotivoPorMover('ajuste')).toBe(true)
    expect(esMotivoDeStock('reasignado')).toBe(true)
    expect(esMotivoDeStock('otro')).toBe(false)
  })

  it('cada motivo tiene su texto', () => {
    expect(TEXTO_DEL_MOTIVO.vendido).toBe('Vender suelto')
    expect(TEXTO_DEL_MOTIVO.devuelto).toBe('Devolver al proveedor')
    expect(Object.keys(TEXTO_DEL_MOTIVO).sort()).toEqual([...MOTIVOS_DE_STOCK].sort())
  })
})
