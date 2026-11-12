import { describe, expect, it } from 'vitest'
import { ordenarTurnos, type Turno } from './turnos'

function turno(id: string, estado: Turno['estado'], venceEn: string | null): Turno {
  return {
    id,
    codigo: `#WEB-${id}`,
    fuente: 'boton_general',
    vehiculoId: null,
    titulo: null,
    venceEn,
    estado,
  }
}

const ids = (turnos: Turno[]) => turnos.map((t) => t.id)

describe('ordenarTurnos', () => {
  it('las vigentes por vence_en ascendente: la que vence primero arriba', () => {
    const lista = ordenarTurnos(
      [
        turno('b', 'asignada', '2026-11-12T14:00:00.000Z'),
        turno('a', 'asignada', '2026-11-12T13:00:00.000Z'),
      ],
      [],
    )
    expect(ids(lista)).toEqual(['a', 'b'])
  })

  it('las directas (sin reloj) van al final de las vigentes', () => {
    const lista = ordenarTurnos(
      [turno('d', 'asignada', null), turno('a', 'asignada', '2026-11-12T13:00:00.000Z')],
      [],
    )
    expect(ids(lista)).toEqual(['a', 'd'])
  })

  it('las vencidas van después de las vigentes y de la más reciente a la más antigua', () => {
    const lista = ordenarTurnos(
      [turno('v', 'asignada', '2026-11-12T20:00:00.000Z')],
      [
        turno('x', 'vencida', '2026-11-12T08:00:00.000Z'),
        turno('y', 'vencida', '2026-11-12T10:00:00.000Z'),
      ],
    )
    expect(ids(lista)).toEqual(['v', 'y', 'x'])
  })

  it('no muta lo que recibe', () => {
    const asignadas = [
      turno('b', 'asignada', '2026-11-12T14:00:00.000Z'),
      turno('a', 'asignada', '2026-11-12T13:00:00.000Z'),
    ]
    ordenarTurnos(asignadas, [])
    expect(ids(asignadas)).toEqual(['b', 'a'])
  })
})
