import { describe, expect, it } from 'vitest'
import { cursorDeSinFecha, paginaDeSinFecha } from './sin-fecha'

const ID_A = '11111111-1111-4111-8111-111111111111'
const ID_B = '22222222-2222-4222-8222-222222222222'

const fila = (id: string, estado: string, creado: string) => ({
  id,
  titulo: `Tarea ${id.slice(0, 2)}`,
  estado,
  creado_en: creado,
  mia: true,
})

describe('paginaDeSinFecha', () => {
  it('parsea las tareas y si hay más; `hecha` sale de estado completado', () => {
    const pagina = paginaDeSinFecha({
      tareas: [
        fila(ID_A, 'pendiente', '2026-11-11T14:00:00.123456+00:00'),
        fila(ID_B, 'completado', '2026-11-10T14:00:00+00:00'),
      ],
      hay_mas: true,
    })
    expect(pagina?.hayMas).toBe(true)
    expect(pagina?.tareas.map((t) => t.hecha)).toEqual([false, true])
    // La precisión del instante se conserva: el cursor la devuelve intacta.
    expect(pagina?.tareas[0]?.creadoEn).toBe('2026-11-11T14:00:00.123456+00:00')
  })

  it('una forma ajena da nulo', () => {
    expect(paginaDeSinFecha(null)).toBeNull()
    expect(paginaDeSinFecha({ tareas: [{ id: 'no-es-uuid' }], hay_mas: false })).toBeNull()
    expect(paginaDeSinFecha({ tareas: [] })).toBeNull()
  })
})

describe('cursorDeSinFecha', () => {
  it('es el (creado_en, id) de la última; sin nada cargado no hay cursor', () => {
    const pagina = paginaDeSinFecha({
      tareas: [
        fila(ID_A, 'pendiente', '2026-11-11T14:00:00+00:00'),
        fila(ID_B, 'pendiente', '2026-11-10T14:00:00.5+00:00'),
      ],
      hay_mas: true,
    })
    expect(cursorDeSinFecha(pagina?.tareas ?? [])).toEqual({
      antesEn: '2026-11-10T14:00:00.5+00:00',
      antesId: ID_B,
    })
    expect(cursorDeSinFecha([])).toBeNull()
  })
})
