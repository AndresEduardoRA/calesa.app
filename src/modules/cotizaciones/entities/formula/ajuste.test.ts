import { describe, expect, it } from 'vitest'
import type { CeldaDeHoja, SecundarioDeCelda } from '../hoja'
import {
  MENSAJE_DEL_MISMO_VALOR,
  MENSAJE_DEL_VALOR_VACIO,
  nodosDelAjuste,
  textoInicial,
  valorTipeado,
} from './ajuste'

const LOCALE = 'es-BO'

const celda = (cambios: Partial<CeldaDeHoja> = {}): CeldaDeHoja => ({
  tipo: 'celda',
  nodo: 'flete',
  etiqueta: 'Flete',
  tipoDeNodo: 'constante',
  formato: 'usd',
  ancho: 'completo',
  tono: null,
  ajustes: true,
  ayuda: null,
  datoDelVehiculo: null,
  soloEn: null,
  condicion: null,
  requeridoSi: null,
  secundario: null,
  editable: true,
  motivo: null,
  ...cambios,
})

const secundario = (cambios: Partial<SecundarioDeCelda> = {}): SecundarioDeCelda => ({
  nodo: 'fees_pct',
  tipoDeNodo: 'constante',
  como: 'porcentaje',
  formato: 'pct',
  ajustes: true,
  editable: false,
  motivo: null,
  ...cambios,
})

describe('nodosDelAjuste', () => {
  it('una celda sola con ⚙: ella, con su etiqueta', () => {
    expect(nodosDelAjuste(celda())).toEqual([
      { nodo: 'flete', tipo: 'constante', formato: 'usd', editable: true, nombre: 'Flete' },
    ])
  })

  it('sólo el secundario con ⚙: el secundario, con «Porcentaje de <etiqueta>»', () => {
    expect(
      nodosDelAjuste(celda({ etiqueta: 'Fees', ajustes: false, secundario: secundario() })),
    ).toEqual([
      {
        nodo: 'fees_pct',
        tipo: 'constante',
        formato: 'pct',
        editable: false,
        nombre: 'Porcentaje de Fees',
      },
    ])
  })

  it('los dos con ⚙: primero la celda, después el secundario', () => {
    const nodos = nodosDelAjuste(celda({ etiqueta: 'Fees', secundario: secundario() }))
    expect(nodos.map((n) => n.nodo)).toEqual(['flete', 'fees_pct'])
  })

  it('un secundario sin ⚙ no entra', () => {
    const nodos = nodosDelAjuste(celda({ secundario: secundario({ ajustes: false }) }))
    expect(nodos.map((n) => n.nodo)).toEqual(['flete'])
  })

  it('un tipo de cambio entra con su tipo (el panel no le da formulario)', () => {
    expect(
      nodosDelAjuste(celda({ nodo: 'tc', tipoDeNodo: 'tipo_cambio', formato: 'raw' })),
    ).toEqual([
      { nodo: 'tc', tipo: 'tipo_cambio', formato: 'raw', editable: true, nombre: 'Flete' },
    ])
  })

  it('una celda sin ⚙ y sin secundario: nada', () => {
    expect(nodosDelAjuste(celda({ ajustes: false }))).toEqual([])
  })
})

describe('valorTipeado', () => {
  it('«13» en un porcentaje manda la fracción 0,13', () => {
    expect(valorTipeado('13', 'pct', LOCALE, null)).toEqual({ ok: true, valor: 0.13 })
  })

  it('«1,1» en un porcentaje da exactamente 0,011 (normalizado a 15 cifras, como la XCell)', () => {
    const leido = valorTipeado('1,1', 'pct', LOCALE, null)
    expect(leido.ok && leido.valor).toBe(0.011)
  })

  it('«1.250» en dólares (es-BO) da 1250; un monto va tal cual', () => {
    expect(valorTipeado('1.250', 'usd', LOCALE, null)).toEqual({ ok: true, valor: 1250 })
    expect(valorTipeado('7', 'raw', LOCALE, 5)).toEqual({ ok: true, valor: 7 })
  })

  it('vacío pide el valor nuevo', () => {
    expect(valorTipeado('  ', 'usd', LOCALE, 5)).toEqual({
      ok: false,
      aviso: MENSAJE_DEL_VALOR_VACIO,
    })
  })

  it('lo que no se lee da el aviso de toda la app', () => {
    expect(valorTipeado('1.5', 'usd', LOCALE, 5)).toEqual({
      ok: false,
      aviso: 'Usa coma para los decimales: 1,5.',
    })
    const ilegible = valorTipeado('abc', 'usd', LOCALE, 5)
    expect(ilegible.ok).toBe(false)
  })

  it('igual al valor por defecto no se pide', () => {
    expect(valorTipeado('5', 'usd', LOCALE, 5)).toEqual({
      ok: false,
      aviso: MENSAJE_DEL_MISMO_VALOR,
    })
  })

  it('igual a 15 cifras también: «1,1» contra 0,011000000000000001', () => {
    expect(valorTipeado('1,1', 'pct', LOCALE, 0.011000000000000001)).toEqual({
      ok: false,
      aviso: MENSAJE_DEL_MISMO_VALOR,
    })
  })

  it('sin valor por defecto leído, cualquier número pasa', () => {
    expect(valorTipeado('0', 'usd', LOCALE, null)).toEqual({ ok: true, valor: 0 })
  })
})

describe('textoInicial', () => {
  it('un porcentaje se edita en puntos', () => {
    expect(textoInicial(0.13, 'pct', LOCALE)).toBe('13')
    expect(textoInicial(0.011, 'pct', LOCALE)).toBe('1,1')
  })

  it('un monto, con la precisión completa y sin agrupar', () => {
    expect(textoInicial(1250.5, 'usd', LOCALE)).toBe('1250,5')
  })
})
