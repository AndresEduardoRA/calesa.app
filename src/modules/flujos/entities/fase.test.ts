import { describe, expect, it } from 'vitest'
import { fasesDesde } from './fase'

function fila(n: number, extra: Record<string, unknown> = {}) {
  return {
    id: `00000000-0000-0000-0000-00000000000${String(n)}`,
    nombre: `Fase ${String(n)}`,
    color: '#465fff',
    orden: n * 10,
    es_inicial: false,
    es_final: false,
    activa: true,
    ...extra,
  }
}

describe('fasesDesde', () => {
  it('las deja en el orden del flujo', () => {
    const fases = fasesDesde([fila(3), fila(1, { es_inicial: true }), fila(2)])
    expect(fases.map((fase) => fase.nombre)).toEqual(['Fase 1', 'Fase 2', 'Fase 3'])
    expect(fases[0]).toMatchObject({ esInicial: true, esFinal: false, activa: true })
  })

  it('a igual orden, por nombre', () => {
    const fases = fasesDesde([
      fila(2, { orden: 10, nombre: 'B' }),
      fila(1, { orden: 10, nombre: 'A' }),
    ])
    expect(fases.map((fase) => fase.nombre)).toEqual(['A', 'B'])
  })

  it('conserva las jubiladas: siguen nombrando lo que quedó ahí', () => {
    expect(fasesDesde([fila(1, { activa: false })])[0]?.activa).toBe(false)
  })

  it('un flujo sin fases es una lista vacía, y una fila sin nombre se rechaza', () => {
    expect(fasesDesde([])).toEqual([])
    expect(() => fasesDesde([{ ...fila(1), nombre: undefined }])).toThrow()
  })
})
