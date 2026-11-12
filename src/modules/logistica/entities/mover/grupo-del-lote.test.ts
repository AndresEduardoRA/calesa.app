import { describe, expect, it } from 'vitest'
import { fraseDelGrupo, unidadesDelGrupo, type UnidadDelGrupo } from './grupo-del-lote'

const u = (id: string, faseId: string | null, orden: number | null): UnidadDelGrupo => ({
  id,
  titulo: id,
  faseId,
  faseNombre: faseId === null ? null : `Fase ${faseId}`,
  faseOrden: orden,
})

describe('unidades de un grupo', () => {
  it('entra la fase con más unidades y el resto queda afuera', () => {
    const r = unidadesDelGrupo([u('1', 'b', 2), u('2', 'b', 2), u('3', 'c', 3)])
    expect(r.fase).toEqual({ id: 'b', nombre: 'Fase b' })
    expect(r.entran.map((x) => x.id)).toEqual(['1', '2'])
    expect(r.fuera).toBe(1)
  })

  it('en empate gana la fase de menor orden', () => {
    const r = unidadesDelGrupo([u('1', 'c', 3), u('2', 'b', 2)])
    expect(r.fase?.id).toBe('b')
    expect(r.fuera).toBe(1)
  })

  it('las unidades sin fase no entran y cuentan afuera', () => {
    const r = unidadesDelGrupo([u('1', null, null), u('2', 'b', 2)])
    expect(r.entran.map((x) => x.id)).toEqual(['2'])
    expect(r.fuera).toBe(1)
    const ninguna = unidadesDelGrupo([u('1', null, null)])
    expect(ninguna.fase).toBeNull()
    expect(ninguna.fuera).toBe(1)
  })

  it('las frases', () => {
    expect(fraseDelGrupo(7, 1)).toBe('Se eligieron 7 de 8; 1 está en otra fase y no entra.')
    expect(fraseDelGrupo(6, 2)).toBe('Se eligieron 6 de 8; 2 están en otra fase y no entran.')
    expect(fraseDelGrupo(8, 0)).toBe('Se eligieron 8.')
  })
})
