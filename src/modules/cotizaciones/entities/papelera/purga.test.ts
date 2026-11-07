import { describe, expect, it } from 'vitest'
import type { LoteDeCotizaciones } from './lotes'
import { diasParaLaPurga, palabraDePurga, textoDePurga, textosDeLaPurga } from './purga'

const AHORA = '2026-11-06T12:00:00.000Z'

describe('diasParaLaPurga', () => {
  it('días enteros que faltan, hacia arriba', () => {
    expect(diasParaLaPurga('2026-11-09T12:00:00.000Z', AHORA)).toBe(3)
    expect(diasParaLaPurga('2026-11-09T12:00:00.001Z', AHORA)).toBe(4)
    expect(diasParaLaPurga('2026-11-06T13:00:00.000Z', AHORA)).toBe(1)
  })

  it('vencido o justo ahora es cero', () => {
    expect(diasParaLaPurga(AHORA, AHORA)).toBe(0)
    expect(diasParaLaPurga('2026-11-01T00:00:00.000Z', AHORA)).toBe(0)
  })
})

describe('textoDePurga', () => {
  it('lo dice en palabras', () => {
    expect(textoDePurga(0)).toBe('Se purga en la próxima pasada')
    expect(textoDePurga(-2)).toBe('Se purga en la próxima pasada')
    expect(textoDePurga(1)).toBe('Se purga mañana')
    expect(textoDePurga(5)).toBe('Se purga en 5 días')
  })
})

describe('palabraDePurga', () => {
  it('ata la confirmación al tamaño del lote', () => {
    expect(palabraDePurga(3)).toBe('purgar 3')
    expect(palabraDePurga(25)).toBe('purgar 25')
  })
})

const UNA_SOLA =
  'Se borra para siempre, con sus revisiones, comentarios y adjuntos. No se puede deshacer ni restaurar.'

function loteDe(
  titulos: string[],
  enPapelera = titulos.length,
): Pick<LoteDeCotizaciones, 'enPapelera' | 'cotizaciones'> {
  return {
    enPapelera,
    cotizaciones: titulos.map((titulo, i) => ({
      id: `id-${String(i)}`,
      numero: i + 1,
      titulo,
      clase: 'preventa' as const,
      origenId: null,
      creadoEn: AHORA,
    })),
  }
}

describe('textosDeLaPurga', () => {
  it('una del lote: la nombra, sin palabra que tipear', () => {
    expect(textosDeLaPurga({ lote: loteDe(['a', 'b']), cotizacionId: 'id-1' })).toEqual({
      titulo: 'Purgar «b»',
      descripcion: UNA_SOLA,
      etiqueta: 'Purgar',
      palabra: undefined,
    })
  })

  it('un lote de una es lo mismo que una', () => {
    expect(textosDeLaPurga({ lote: loteDe(['a']) })).toEqual({
      titulo: 'Purgar «a»',
      descripcion: UNA_SOLA,
      etiqueta: 'Purgar',
      palabra: undefined,
    })
  })

  it('un lote de tres: los tres títulos y «purgar 3»', () => {
    expect(textosDeLaPurga({ lote: loteDe(['a', 'b', 'c']) })).toEqual({
      titulo: 'Purgar el lote de 3',
      descripcion:
        'Se borran para siempre, con sus revisiones, comentarios y adjuntos: «a», «b», «c». No se puede deshacer ni restaurar.',
      etiqueta: 'Purgar las 3',
      palabra: 'purgar 3',
    })
  })

  it('un lote de 25 con 20 a la vista: cinco títulos, «y 20 más» y cuenta el lote entero', () => {
    const titulos = Array.from({ length: 20 }, (_, i) => `t${String(i + 1)}`)
    expect(textosDeLaPurga({ lote: loteDe(titulos, 25) })).toEqual({
      titulo: 'Purgar el lote de 25',
      descripcion:
        'Se borran para siempre, con sus revisiones, comentarios y adjuntos: «t1», «t2», «t3», «t4», «t5» y 20 más. No se puede deshacer ni restaurar.',
      etiqueta: 'Purgar las 25',
      palabra: 'purgar 25',
    })
  })
})
