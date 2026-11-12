import { describe, expect, it } from 'vitest'
import { itemDelPanelDesde } from './item-del-panel'

const G = (n: number) =>
  `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`
const fila = {
  id: G(1),
  descripcion: 'Faro izquierdo',
  fase_id: G(2),
  fase_desde: '2026-11-01T10:00:00Z',
  fase: { id: G(2), nombre: 'En tránsito', color: '#0a0' },
  proyecto: { id: G(3), numero: 7, vehiculo_id: G(4) },
}

describe('el ítem del panel', () => {
  it('una fila válida se convierte en el ítem', () => {
    expect(itemDelPanelDesde(fila)).toEqual({
      ok: true,
      data: {
        id: G(1),
        descripcion: 'Faro izquierdo',
        faseId: G(2),
        faseDesde: '2026-11-01T10:00:00Z',
        fase: { nombre: 'En tránsito', color: '#0a0' },
        proyecto: { id: G(3), numero: 7, vehiculoId: G(4) },
      },
    })
  })

  it('sin fase queda con la fase nula', () => {
    const r = itemDelPanelDesde({ ...fila, fase_id: null, fase_desde: null, fase: null })
    expect(r.ok && r.data?.fase).toBeNull()
  })

  it('un id que no es guid o un proyecto que no es un objeto es inesperado', () => {
    const malo = itemDelPanelDesde({ ...fila, id: 'x' })
    expect(!malo.ok && malo.error.codigo).toBe('inesperado')
    const sinProyecto = itemDelPanelDesde({ ...fila, proyecto: 3 })
    expect(!sinProyecto.ok && sinProyecto.error.codigo).toBe('inesperado')
  })

  it('un proyecto que la RLS no deja ver deja el ítem en nulo', () => {
    expect(itemDelPanelDesde({ ...fila, proyecto: null })).toEqual({ ok: true, data: null })
  })
})
