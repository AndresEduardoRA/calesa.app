import { describe, expect, it } from 'vitest'
import { esquemaGuardarCelda } from './celda'

const ID = '7f9c1d2e-3a4b-4c5d-8e6f-0123456789ab'
const base = {
  id: ID,
  columna: 'descripcion',
  valor: 'Faro',
  actualizadoEn: '2026-11-12T10:00:00Z',
}

describe('esquemaGuardarCelda', () => {
  it('acepta una columna editable con su valor', () => {
    expect(esquemaGuardarCelda.safeParse(base).success).toBe(true)
    expect(esquemaGuardarCelda.safeParse({ ...base, columna: 'cantidad', valor: 2 }).success).toBe(
      true,
    )
    expect(esquemaGuardarCelda.safeParse({ ...base, columna: 'notas', valor: null }).success).toBe(
      true,
    )
  })

  it('rechaza un id que no es guid', () => {
    expect(esquemaGuardarCelda.safeParse({ ...base, id: '12' }).success).toBe(false)
  })

  it('rechaza las columnas que no se editan', () => {
    for (const columna of [
      'fase_id',
      'stock_cantidad',
      'en_stock_desde',
      'eliminado_en',
      'proyecto_id',
    ]) {
      expect(esquemaGuardarCelda.safeParse({ ...base, columna }).success).toBe(false)
    }
  })

  it('rechaza un valor de otro tipo', () => {
    expect(esquemaGuardarCelda.safeParse({ ...base, valor: true }).success).toBe(false)
    expect(esquemaGuardarCelda.safeParse({ ...base, valor: { a: 1 } }).success).toBe(false)
  })
})
