import { describe, expect, it } from 'vitest'
import { leerMensajes, mensajeLocal } from './mensajes'

const YO = '11111111-1111-4111-8111-111111111111'
const OTRA = '22222222-2222-4222-8222-222222222222'
const CONVERSACION = '33333333-3333-4333-8333-333333333333'

function id(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
}

function fila(n: number, extra: Record<string, unknown> = {}) {
  return {
    id: id(n),
    conversacion_id: CONVERSACION,
    autor_id: OTRA,
    tipo: 'texto',
    cuerpo: `mensaje ${String(n)}`,
    creado_en: `2026-11-12T10:00:${String(n).padStart(2, '0')}+00:00`,
    editado_en: null,
    eliminado_en: null,
    responde_a_id: null,
    autor: { nombre: 'Marta' },
    ...extra,
  }
}

describe('la cita de un mensaje respondido', () => {
  it('con una cita pone el id del respondido; sin ella, nulo', () => {
    const base = {
      id: id(7),
      conversacion: CONVERSACION,
      cuerpo: 'hola',
      yo: YO,
      nombre: 'Ana',
      ahora: '2026-11-12T11:00:00.000Z',
    }
    const cita = { id: id(3), autorNombre: 'Marta', cuerpo: 'mensaje 3', eliminado: false }
    expect(mensajeLocal({ ...base, responde: cita })).toMatchObject({
      respondeAId: id(3),
      responde: cita,
    })
    expect(mensajeLocal(base)).toMatchObject({ respondeAId: null, responde: null })
  })

  it('lee la cita con y sin autor, eliminada, y sin cita', () => {
    const original = {
      id: id(1),
      cuerpo: 'mensaje 1',
      eliminado_en: null,
      autor: { nombre: 'Luis' },
    }
    const lectura = leerMensajes(
      [
        fila(4, { responde_a_id: id(1), responde: original }),
        fila(3, { responde_a_id: id(1), responde: { ...original, autor: null } }),
        fila(2, {
          responde_a_id: id(1),
          responde: { ...original, cuerpo: null, eliminado_en: '2026-11-12T10:30:00+00:00' },
        }),
        fila(1, { responde: null }),
      ],
      20,
    )
    expect(lectura.ok).toBe(true)
    if (lectura.ok) {
      const [m1, m2, m3, m4] = lectura.data.mensajes
      expect(m1?.responde).toBeNull()
      expect(m2?.responde).toEqual({
        id: id(1),
        autorNombre: 'Luis',
        cuerpo: null,
        eliminado: true,
      })
      expect(m3?.responde?.autorNombre).toBeNull()
      expect(m4?.responde).toEqual({
        id: id(1),
        autorNombre: 'Luis',
        cuerpo: 'mensaje 1',
        eliminado: false,
      })
    }
  })

  it('rechaza una cita sin id', () => {
    const cita = { cuerpo: 'x', eliminado_en: null }
    expect(leerMensajes([fila(1, { responde_a_id: id(2), responde: cita })], 20).ok).toBe(false)
  })
})
