import { describe, expect, it } from 'vitest'
import { migracionesEnOrden } from '../../../../../scripts/lib/definicion-sql'
import { MOTIVOS_POR_MOVER } from './motivos'
import {
  MENSAJE_DE_CANTIDAD_DE_STOCK,
  MENSAJE_DE_DESTINO_CERRADO,
  MENSAJE_DE_MISMO_PROYECTO,
  MENSAJE_DE_MOTIVO_INEXISTENTE,
  MENSAJE_DE_NOTA_LARGA,
  MENSAJE_DE_REASIGNAR_POR_MOVER,
  MENSAJE_DE_TODO_EN_STOCK,
  disponibleParaStock,
  enStockTras,
  soloHayEnStock,
  soloPuedesPasar,
  validarMovimiento,
  validarNotaDeStock,
  validarReasignacion,
} from './reglas'

describe('disponibleParaStock', () => {
  it('es la cantidad menos lo que ya entró, y nunca negativo', () => {
    expect(disponibleParaStock(3, 0)).toBe(3)
    expect(disponibleParaStock(3, 2)).toBe(1)
    expect(disponibleParaStock(3, 3)).toBe(0)
    // La cantidad se bajó después de pasar a stock: no queda nada, no un negativo.
    expect(disponibleParaStock(2, 3)).toBe(0)
  })
})

describe('validarMovimiento', () => {
  it('sobrante entra con su signo y hasta lo disponible', () => {
    expect(validarMovimiento({ motivo: 'sobrante', cantidad: 2, stock: 0, disponible: 3 })).toEqual(
      { ok: true, stockTras: 2, cantidadConSigno: 2 },
    )
    expect(validarMovimiento({ motivo: 'sobrante', cantidad: 2, stock: 2, disponible: 1 })).toEqual(
      { ok: false, campo: 'cantidad', error: soloPuedesPasar(1) },
    )
    expect(validarMovimiento({ motivo: 'sobrante', cantidad: 1, stock: 1, disponible: 0 })).toEqual(
      { ok: false, campo: 'cantidad', error: MENSAJE_DE_TODO_EN_STOCK },
    )
  })

  it('vendido, devuelto y ajuste sólo restan y nunca dejan el stock negativo', () => {
    for (const motivo of ['vendido', 'devuelto', 'ajuste'] as const) {
      expect(validarMovimiento({ motivo, cantidad: 2, stock: 2, disponible: 99 })).toEqual({
        ok: true,
        stockTras: 0,
        cantidadConSigno: -2,
      })
      expect(validarMovimiento({ motivo, cantidad: 3, stock: 2, disponible: 99 })).toEqual({
        ok: false,
        campo: 'cantidad',
        error: soloHayEnStock(2),
      })
    }
  })

  it('reasignado no pasa por mover y la cantidad es un entero desde 1', () => {
    expect(
      validarMovimiento({ motivo: 'reasignado', cantidad: 1, stock: 2, disponible: 0 }),
    ).toEqual({ ok: false, campo: 'motivo', error: MENSAJE_DE_REASIGNAR_POR_MOVER })
    for (const cantidad of [0, -1, 1.5, Number.NaN]) {
      expect(validarMovimiento({ motivo: 'vendido', cantidad, stock: 5, disponible: 5 })).toEqual({
        ok: false,
        campo: 'cantidad',
        error: MENSAJE_DE_CANTIDAD_DE_STOCK,
      })
    }
  })
})

describe('validarReasignacion', () => {
  it('rechaza el mismo proyecto, el destino cerrado y más que el stock; si no, dice lo que queda', () => {
    const base = { cantidad: 1, stock: 2, mismoProyecto: false, destinoCerrado: false }
    expect(validarReasignacion(base)).toEqual({ ok: true, stockTras: 1 })
    expect(validarReasignacion({ ...base, mismoProyecto: true })).toEqual({
      ok: false,
      campo: 'proyecto',
      error: MENSAJE_DE_MISMO_PROYECTO,
    })
    expect(validarReasignacion({ ...base, destinoCerrado: true })).toEqual({
      ok: false,
      campo: 'proyecto',
      error: MENSAJE_DE_DESTINO_CERRADO,
    })
    expect(validarReasignacion({ ...base, cantidad: 3 })).toEqual({
      ok: false,
      campo: 'cantidad',
      error: soloHayEnStock(2),
    })
    expect(validarReasignacion({ ...base, cantidad: 0 })).toEqual({
      ok: false,
      campo: 'cantidad',
      error: MENSAJE_DE_CANTIDAD_DE_STOCK,
    })
  })
})

describe('enStockTras y la nota', () => {
  it('fija la fecha al pasar de 0, la conserva mientras quede y la limpia en 0', () => {
    const ahora = '2026-11-12T10:00:00Z'
    expect(enStockTras(2, null, ahora)).toBe(ahora)
    expect(enStockTras(1, '2026-11-01T00:00:00Z', ahora)).toBe('2026-11-01T00:00:00Z')
    expect(enStockTras(0, '2026-11-01T00:00:00Z', ahora)).toBeNull()
  })

  it('la nota admite hasta 500 caracteres recortada', () => {
    expect(validarNotaDeStock(` ${'x'.repeat(500)} `)).toBeNull()
    expect(validarNotaDeStock(null)).toBeNull()
    expect(validarNotaDeStock('x'.repeat(501))).toEqual({
      ok: false,
      campo: 'nota',
      error: MENSAJE_DE_NOTA_LARGA,
    })
  })
})

describe('los textos son los de la base', () => {
  // Todas las migraciones (nunca un archivo por su nombre: cambia al aplastar).
  const sql = migracionesEnOrden()
    .map((m) => m.texto)
    .join('\n')

  it('cada mensaje y cada motivo de mover está en las migraciones', () => {
    for (const texto of [
      MENSAJE_DE_CANTIDAD_DE_STOCK,
      MENSAJE_DE_MOTIVO_INEXISTENTE,
      MENSAJE_DE_REASIGNAR_POR_MOVER,
      MENSAJE_DE_TODO_EN_STOCK,
      MENSAJE_DE_MISMO_PROYECTO,
      MENSAJE_DE_DESTINO_CERRADO,
      MENSAJE_DE_NOTA_LARGA,
      'Sólo puedes pasar % más de este ítem a stock.',
      'Sólo hay % en stock.',
    ]) {
      expect(sql).toContain(texto)
    }
    expect(sql).toContain(`not in (${MOTIVOS_POR_MOVER.map((m) => `'${m}'`).join(', ')})`)
  })
})
