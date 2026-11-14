import { describe, expect, it } from 'vitest'
import { datosDeLaFila } from './vitrina-rapida'

const fila = {
  id: '0b1c2d3e-0000-4000-8000-000000000001',
  titulo: 'Kia Rio',
  actualizadoEn: '2026-11-14T10:00:00Z',
  publicadoWeb: false,
  precioWeb: 15000,
  precioWebHasta: 16000,
  precioWebNota: 'Con papeles',
  destacadoWeb: true,
}

describe('datosDeLaFila', () => {
  it('publicar conserva lo guardado', () => {
    expect(datosDeLaFila(fila, true)).toEqual({
      publicado: true,
      precio: 15000,
      precioHasta: 16000,
      nota: 'Con papeles',
      destacado: true,
    })
  })

  it('un precio nuevo mayor que el «hasta» lo suelta; sin precio no hay «hasta»', () => {
    expect(datosDeLaFila(fila, true, 17000)).toMatchObject({ precio: 17000, precioHasta: null })
    expect(datosDeLaFila(fila, true, null)).toMatchObject({ precio: null, precioHasta: null })
  })

  it('sacar apaga el destacado', () => {
    expect(datosDeLaFila({ ...fila, publicadoWeb: true }, false)).toMatchObject({
      publicado: false,
      destacado: false,
    })
  })
})
