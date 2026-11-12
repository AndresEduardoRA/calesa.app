import { describe, expect, it } from 'vitest'

import casos from './casos-del-cotizador.json'
import { aEscala, aTexto } from './decimal'
import {
  calcularLinea,
  sugerirLogistica,
  totalDeLaCotizacion,
  type BloqueDeCotizacion,
} from './formula'
import { leerSnapshot, type SnapshotDelCotizador } from './snapshot'

function snapshot(clave: string): SnapshotDelCotizador {
  const leido = leerSnapshot((casos.configs as Record<string, unknown>)[clave])
  if (!leido.ok) throw new Error(`la config ${clave} del archivo de casos no es un snapshot válido`)
  return leido.snapshot
}

describe('calcularLinea: los casos compartidos con la base', () => {
  it.each(casos.casos)('$nombre: $que', (caso) => {
    const r = calcularLinea(snapshot(caso.config), {
      bloque: caso.bloque as BloqueDeCotizacion,
      cantidad: caso.cantidad,
      costo: caso.costo,
      logistica: caso.logistica,
      caja: caso.caja,
    })
    expect({
      logistica_sugerida: r.logisticaSugerida,
      unitario: r.unitario,
      total: r.total,
      falta: r.falta,
    }).toEqual(caso.esperado)
  })

  it('cubre los dos bloques, la mitad, el tramo abierto, sin tramo y lo que no cabe', () => {
    const faltas = new Set(casos.casos.map((c) => c.esperado.falta))
    expect(faltas).toEqual(new Set([null, 'costo', 'logistica', 'caja', 'no_cabe']))
    expect(new Set(casos.casos.map((c) => c.bloque))).toEqual(new Set(['importado', 'local']))
  })
})

describe('sugerirLogistica', () => {
  const tramos = snapshot('A').tramos
  it('el costo_min es inclusivo y el costo_max exclusivo', () => {
    expect(sugerirLogistica(tramos, '99.99')).toBe('15.00')
    expect(sugerirLogistica(tramos, '100')).toBe('40.00')
    expect(sugerirLogistica(tramos, '1999.99')).toBe('90.00')
  })
  it('por encima del último tramo, o sin costo, no hay sugerencia', () => {
    expect(sugerirLogistica(tramos, '2000.00')).toBeNull()
    expect(sugerirLogistica(tramos, null)).toBeNull()
    expect(sugerirLogistica([], '10')).toBeNull()
  })
})

describe('totalDeLaCotizacion', () => {
  it('suma exacta, sin float', () => {
    expect(totalDeLaCotizacion(['0.10', '0.20'])).toBe('0.30')
    expect(totalDeLaCotizacion(['9999999999999.99', '0.01'])).toBe('10000000000000.00')
  })
  it('con un total nulo, o sin líneas, es nulo (nulo no es 0)', () => {
    expect(totalDeLaCotizacion(['1.00', null])).toBeNull()
    expect(totalDeLaCotizacion([])).toBeNull()
    expect(totalDeLaCotizacion(['0.00'])).toBe('0.00')
  })
})

describe('decimales y snapshot', () => {
  it('aEscala rechaza más decimales que la escala, la notación científica y los negativos', () => {
    expect(aEscala('1.234', 2)).toBeNull()
    expect(aEscala('1e3', 2)).toBeNull()
    expect(aEscala('-1', 2)).toBeNull()
    expect(aEscala('1.2500', 2)).toBe(125n)
    expect(aEscala('7', 2)).toBe(700n)
  })
  it('aTexto escribe la escala completa', () => {
    expect(aTexto(5n, 2)).toBe('0.05')
    expect(aTexto(123456n, 4)).toBe('12.3456')
  })
  it('leerSnapshot rechaza un número JSON donde va un decimal como texto, y otra versión', () => {
    const base = casos.configs.A
    expect(leerSnapshot({ ...base, config: { ...base.config, factor_importado: 1.35 } }).ok).toBe(
      false,
    )
    expect(leerSnapshot({ ...base, version: 2 }).ok).toBe(false)
    expect(leerSnapshot({ ...base, config: { ...base.config, recargo_local: '0.10001' } }).ok).toBe(
      false,
    )
    expect(leerSnapshot({ ...base, cajas: [{ id: base.cajas[0]?.id, monto: '10.001' }] }).ok).toBe(
      false,
    )
    expect(leerSnapshot(base).ok).toBe(true)
  })
})
