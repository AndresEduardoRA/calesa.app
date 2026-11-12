import { describe, expect, it } from 'vitest'
import {
  claveDeFicha,
  estaVencida,
  puedeCompletarDesdeFicha,
  resolverFichas,
  type DatosDeFichaDeTarea,
} from './fichas'

const T = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const E = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const ANA = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const LUIS = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

const filaDeTarea = {
  id: T,
  titulo: 'Revisar el contenedor',
  vence_en: '2026-11-13T22:00:00+00:00',
  estado: 'pendiente',
  completada_en: null,
  responsable_id: LUIS,
  creado_por: ANA,
  actualizado_en: '2026-11-12T12:00:00+00:00',
  eliminado_en: null,
}
const filaDeEvento = {
  id: E,
  titulo: 'Reunión',
  inicia_en: '2026-11-13T14:00:00+00:00',
  lugar: null,
  estado: 'pendiente',
  eliminado_en: null,
}
const perfiles = [{ id: LUIS, nombre: 'Luis Chat' }]

function datosDeTarea(extra: Partial<DatosDeFichaDeTarea> = {}): DatosDeFichaDeTarea {
  return {
    clase: 'tarea',
    titulo: 'x',
    venceEn: null,
    estado: 'pendiente',
    completadaEn: null,
    responsableId: LUIS,
    responsableNombre: 'Luis Chat',
    creadoPor: ANA,
    actualizadoEn: '2026-11-12T12:00:00+00:00',
    ...extra,
  }
}

describe('resolverFichas', () => {
  it('una tarea y un evento que llegaron son visibles, con el nombre del responsable', () => {
    const r = resolverFichas(
      [
        { clase: 'tarea', id: T },
        { clase: 'evento', id: E },
      ],
      [filaDeTarea],
      [filaDeEvento],
      perfiles,
    )
    expect(r.ok).toBe(true)
    if (!r.ok) {
      return
    }
    expect(r.data.get(claveDeFicha('tarea', T))).toEqual({
      situacion: 'visible',
      id: T,
      datos: {
        clase: 'tarea',
        titulo: 'Revisar el contenedor',
        venceEn: '2026-11-13T22:00:00+00:00',
        estado: 'pendiente',
        completadaEn: null,
        responsableId: LUIS,
        responsableNombre: 'Luis Chat',
        creadoPor: ANA,
        actualizadoEn: '2026-11-12T12:00:00+00:00',
      },
    })
    expect(r.data.get(claveDeFicha('evento', E))).toMatchObject({
      situacion: 'visible',
      datos: { clase: 'evento', titulo: 'Reunión', lugar: null },
    })
  })

  it('un id sin fila no se ve (la RLS no distingue «no existe» de «no es tuyo»)', () => {
    const r = resolverFichas([{ clase: 'evento', id: E }], [], [], [])
    expect(r.ok && r.data.get(claveDeFicha('evento', E))).toEqual({ situacion: 'no_disponible' })
  })

  it('una fila con eliminado_en está eliminada', () => {
    const r = resolverFichas(
      [{ clase: 'tarea', id: T }],
      [{ ...filaDeTarea, eliminado_en: '2026-11-12T13:00:00+00:00' }],
      [],
      perfiles,
    )
    expect(r.ok && r.data.get(claveDeFicha('tarea', T))).toEqual({ situacion: 'eliminada' })
  })

  it('una fila mal formada es un error de lectura, no una excepción', () => {
    const r = resolverFichas([{ clase: 'tarea', id: T }], [{ ...filaDeTarea, estado: 7 }], [], [])
    expect(r.ok).toBe(false)
  })

  it('sin nombre del responsable queda nulo', () => {
    const r = resolverFichas([{ clase: 'tarea', id: T }], [filaDeTarea], [], [])
    expect(r.ok && r.data.get(claveDeFicha('tarea', T))).toMatchObject({
      datos: { responsableNombre: null },
    })
  })
})

describe('puedeCompletarDesdeFicha', () => {
  it('el responsable puede completar una tarea pendiente o reabrir una hecha', () => {
    expect(puedeCompletarDesdeFicha(datosDeTarea(), LUIS)).toBe(true)
    expect(puedeCompletarDesdeFicha(datosDeTarea({ estado: 'completado' }), LUIS)).toBe(true)
  })
  it('no el creador que no es responsable, ni un tercero, ni con la tarea cancelada', () => {
    expect(puedeCompletarDesdeFicha(datosDeTarea(), ANA)).toBe(false)
    expect(puedeCompletarDesdeFicha(datosDeTarea(), 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')).toBe(
      false,
    )
    expect(puedeCompletarDesdeFicha(datosDeTarea({ estado: 'cancelado' }), LUIS)).toBe(false)
  })
})

describe('estaVencida', () => {
  const ahora = '2026-11-14T00:00:00+00:00'
  it('una pendiente con el vencimiento pasado está vencida', () => {
    expect(estaVencida(datosDeTarea({ venceEn: '2026-11-13T22:00:00+00:00' }), ahora)).toBe(true)
  })
  it('sin vencimiento, por venir o ya hecha, no', () => {
    expect(estaVencida(datosDeTarea(), ahora)).toBe(false)
    expect(estaVencida(datosDeTarea({ venceEn: '2026-11-15T00:00:00+00:00' }), ahora)).toBe(false)
    expect(
      estaVencida(
        datosDeTarea({ estado: 'completado', venceEn: '2026-11-13T22:00:00+00:00' }),
        ahora,
      ),
    ).toBe(false)
  })
})
