import { describe, expect, it } from 'vitest'
import { formaDePlantilla } from './forma-de-plantilla'

const minima = {
  grupos: [{ grupo: 'compra' }, { grupo: 'logistica' }],
  total: { etiqueta: 'Total' },
  logo: false,
  columnas: { leyenda: false, tipo_cambio: false, plazo: false },
}
const donde = (entrada: unknown) => {
  const r = formaDePlantilla(entrada)
  return r.ok ? 'válida' : `${r.error.regla}@${r.error.donde}`
}

describe('formaDePlantilla', () => {
  it('valida lo que viaja: lo que no es JSON es `definicion`, como la base con un nulo', () => {
    const ciclo: Record<string, unknown> = { ...minima }
    ciclo['yo'] = ciclo
    expect(donde(undefined)).toBe('forma@definicion')
    expect(donde(() => minima)).toBe('forma@definicion')
    expect(donde(ciclo)).toBe('forma@definicion')
    expect(donde({ ...minima, nota: 1n })).toBe('forma@definicion')
    // Una propiedad `undefined` no viaja: no hay nota.
    expect(donde({ ...minima, nota: undefined })).toBe('válida')
  })

  it('la raíz es un objeto', () => {
    expect(donde([])).toBe('forma@definicion')
    expect(donde(null)).toBe('forma@definicion')
    expect(donde('x')).toBe('forma@definicion')
  })

  it('el tope es exacto en bytes de texto jsonb: 32 768 pasa y 32 769 no', () => {
    // Leyendas de 160 «x» hasta quedar a menos de una del tope, y la nota (hasta 300) completa los bytes que faltan.
    const conRelleno = (bytes: number) => {
      const leyendas: Record<string, string> = {}
      const medir = (nota: string) =>
        new TextEncoder().encode(texto({ ...minima, leyendas, nota })).length
      for (let i = 0; medir('') + 172 <= bytes; i++) leyendas[`n${i}`] = 'x'.repeat(160)
      return { ...minima, leyendas, nota: 'x'.repeat(bytes - medir('')) }
    }
    expect(donde(conRelleno(32768))).toBe('válida')
    expect(donde(conRelleno(32769))).toBe('forma@definicion')
  })
})

describe('formaDePlantilla, de F2 a F15', () => {
  it.each([
    ['F2 una clave de más', { ...minima, paleta: 1 }, 'forma@paleta'],
    ['F3 grupos no es arreglo', { ...minima, grupos: {} }, 'forma@grupos'],
    ['F3 sin grupos', { ...minima, grupos: undefined }, 'forma@grupos'],
    [
      'F4 un grupo que no es objeto',
      { ...minima, grupos: [{ grupo: 'compra' }, []] },
      'forma@grupos[1]',
    ],
    [
      'F4 un grupo con una clave de más',
      { ...minima, grupos: [{ grupo: 'compra', color: 'x' }] },
      'forma@grupos[0]',
    ],
    ['F5 un id mal formado', { ...minima, grupos: [{ grupo: 'Compra' }] }, 'forma@grupos[0].grupo'],
    [
      'F6 un tono que no es id',
      { ...minima, grupos: [{ grupo: 'compra', tono: '#fff' }] },
      'forma@grupos[0].tono',
    ],
    ['F7 etiquetas en un arreglo', { ...minima, etiquetas: [] }, 'forma@etiquetas'],
    ['F8 una clave de leyenda mal formada', { ...minima, leyendas: { Mal: '' } }, 'forma@leyendas'],
    ['F9 una leyenda que no es texto', { ...minima, leyendas: { fees: 1 } }, 'forma@leyendas.fees'],
    ['F9 una leyenda vacía vale', { ...minima, leyendas: { fees: '' } }, 'válida'],
    ['F10 total en un arreglo', { ...minima, total: [] }, 'forma@total'],
    [
      'F10 total con una clave de más',
      { ...minima, total: { etiqueta: 'T', color: 'x' } },
      'forma@total',
    ],
    [
      'F11 la etiqueta del total vacía',
      { ...minima, total: { etiqueta: ' ' } },
      'forma@total.etiqueta',
    ],
    [
      'F11 la etiqueta del total de 41',
      { ...minima, total: { etiqueta: 'x'.repeat(41) } },
      'forma@total.etiqueta',
    ],
    [
      'F12 la leyenda del total de 161',
      { ...minima, total: { etiqueta: 'T', leyenda: 'x'.repeat(161) } },
      'forma@total.leyenda',
    ],
    ['F13 una nota de 301', { ...minima, nota: 'x'.repeat(301) }, 'forma@nota'],
    ['F13 una nota nula', { ...minima, nota: null }, 'forma@nota'],
    ['F14 sin logo', { ...minima, logo: undefined }, 'forma@logo'],
    [
      'F15 una columna de más',
      { ...minima, columnas: { ...minima.columnas, otra: true } },
      'forma@columnas',
    ],
    [
      'F15 una columna que no es booleana',
      { ...minima, columnas: { ...minima.columnas, plazo: 1 } },
      'forma@columnas',
    ],
  ])('%s', (_, entrada, esperado) => {
    expect(donde(entrada)).toBe(esperado)
  })

  it('recorre cada diccionario clave por clave en orden C (no todas las claves primero)', () => {
    expect(donde({ ...minima, etiquetas: { c_Z: 'x', b: '' } })).toBe('forma@etiquetas.b')
    expect(donde({ ...minima, etiquetas: { b: 'x', B: 'x' } })).toBe('forma@etiquetas')
  })

  it('las etiquetas van antes que las leyendas, y las dos antes que el total', () => {
    expect(donde({ ...minima, total: undefined, leyendas: { a: 1 }, etiquetas: { a: '' } })).toBe(
      'forma@etiquetas.a',
    )
  })

  it('devuelve la plantilla normalizada', () => {
    const r = formaDePlantilla({ ...minima, nota: undefined })
    expect(r).toEqual({ ok: true, plantilla: minima })
  })
})

// El texto jsonb (", " y ": ") de un valor, para armar el relleno exacto.
function texto(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(texto).join(', ')}]`
  if (v !== null && typeof v === 'object')
    return `{${Object.entries(v)
      .map(([k, x]) => `${JSON.stringify(k)}: ${texto(x)}`)
      .join(', ')}}`
  return JSON.stringify(v)
}
