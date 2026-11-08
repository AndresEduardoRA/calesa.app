import { describe, expect, it } from 'vitest'
import { filtroDeCursor, marcarTapadas, type TablaDeReferencia } from './lectura'

const tabla = (clave: string, compartida: boolean): Omit<TablaDeReferencia, 'tapada'> => ({
  id: `${clave}-${String(compartida)}`,
  origenId: compartida ? null : '11111111-1111-4111-8111-111111111111',
  clave,
  nombre: clave,
  descripcion: null,
  columnas: [],
  version: 1,
  nota: null,
  publicadoEn: null,
  publicadoPor: null,
  compartida,
})

describe('marcarTapadas', () => {
  it('una compartida con una propia de su clave queda tapada; sin ella, no; una propia nunca', () => {
    const marcadas = marcarTapadas([
      tabla('fletes', false),
      tabla('fletes', true),
      tabla('tasas', true),
    ])
    expect(marcadas.map((t) => [t.clave, t.compartida, t.tapada])).toEqual([
      ['fletes', false, false],
      ['fletes', true, true],
      ['tasas', true, false],
    ])
  })
})

describe('filtroDeCursor', () => {
  it('las filas después de la última en (orden, id)', () => {
    expect(filtroDeCursor({ orden: 7, id: 'abc' })).toBe('orden.gt.7,and(orden.eq.7,id.gt.abc)')
  })
})
