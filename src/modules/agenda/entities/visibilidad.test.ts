import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import {
  DIAS_MAXIMOS_DEL_RANGO,
  exigePublicar,
  puedeCompletarTarea,
  puedeDarTareaAOtro,
  puedeEditarEvento,
  puedeEditarTarea,
  puedeElegirVisibilidad,
  puedeReasignarTarea,
  puedeVerEvento,
  TOPE_DE_DESTINATARIOS,
  type Visibilidad,
} from './visibilidad'

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' }))
const CREADOR = 'creador'
const DESTINATARIO = 'destinatario'
const TERCERO = 'tercero'
const VER_TODO = 'ver-todo'
const evento = (visibilidad: Visibilidad, eliminado = false) => ({
  creadoPor: CREADOR,
  visibilidad,
  eliminado,
})

describe('las constantes espejan la base', () => {
  it('50 destinatarios y 45 días por rango', () => {
    expect(TOPE_DE_DESTINATARIOS).toBe(50)
    expect(DIAS_MAXIMOS_DEL_RANGO).toBe(45)
  })
})

describe('puedeVerEvento', () => {
  // Como la matriz E4 de supabase/tests/areas/agenda/eventos-leer.sql: [creador, destinatario, tercero, ver_todo].
  const personas = [
    { yo: CREADOR, permisos: con(), destinatario: false },
    { yo: DESTINATARIO, permisos: con(), destinatario: true },
    { yo: TERCERO, permisos: con(), destinatario: false },
    { yo: VER_TODO, permisos: con('agenda.ver_todo'), destinatario: false },
  ]
  const esperado: Record<Visibilidad, boolean[]> = {
    privado: [true, false, false, true],
    publico: [true, true, true, true],
    seleccionados: [true, true, false, true],
  }

  it.each(Object.entries(esperado))(
    '%s × creador, destinatario, tercero y ver_todo',
    (vis, filas) => {
      // Destinatarios sólo hay en «seleccionados» (como en la base).
      const vistos = personas.map((p) =>
        puedeVerEvento(
          evento(vis as Visibilidad),
          p.yo,
          p.permisos,
          p.destinatario && vis === 'seleccionados',
        ),
      )
      expect(vistos).toEqual(filas)
    },
  )

  it('un evento eliminado no lo ve nadie', () => {
    for (const vis of ['privado', 'publico', 'seleccionados'] as const) {
      const vistos = personas.map((p) =>
        puedeVerEvento(evento(vis, true), p.yo, p.permisos, p.destinatario),
      )
      expect(vistos).toEqual([false, false, false, false])
    }
  })
})

describe('exigePublicar', () => {
  const casos: [Visibilidad | null, Visibilidad, boolean][] = [
    [null, 'privado', false],
    [null, 'publico', true],
    [null, 'seleccionados', true],
    ['privado', 'privado', false],
    ['privado', 'publico', true],
    ['privado', 'seleccionados', true],
    ['publico', 'privado', true],
    ['publico', 'publico', true],
    ['seleccionados', 'privado', true],
    ['seleccionados', 'seleccionados', true],
  ]
  it.each(casos)('de %s a %s → %s (despublicar también lo pide, D18)', (antes, despues, pide) => {
    expect(exigePublicar(antes, despues)).toBe(pide)
  })
})

describe('eventos: elegir visibilidad y editar', () => {
  it('sin publicar sólo se elige privado', () => {
    expect(puedeElegirVisibilidad('privado', con())).toBe(true)
    expect(puedeElegirVisibilidad('publico', con())).toBe(false)
    expect(puedeElegirVisibilidad('seleccionados', con())).toBe(false)
    expect(puedeElegirVisibilidad('seleccionados', con('agenda.eventos.publicar'))).toBe(true)
  })

  it('el creador sin publicar edita su privado y no su público; nadie más edita', () => {
    expect(puedeEditarEvento(evento('privado'), CREADOR, con())).toBe(true)
    expect(puedeEditarEvento(evento('publico'), CREADOR, con())).toBe(false)
    expect(puedeEditarEvento(evento('publico'), CREADOR, con('agenda.eventos.publicar'))).toBe(true)
    expect(
      puedeEditarEvento(
        evento('privado'),
        VER_TODO,
        con('agenda.ver_todo', 'agenda.eventos.publicar'),
      ),
    ).toBe(false)
  })
})

describe('tareas', () => {
  const tarea = { creadoPor: CREADOR, responsableId: DESTINATARIO }
  const todo = con('agenda.tareas.asignar', 'agenda.ver_todo')

  it('el responsable completa y no edita ni reasigna', () => {
    expect(puedeCompletarTarea(tarea, DESTINATARIO)).toBe(true)
    expect(puedeEditarTarea(tarea, DESTINATARIO)).toBe(false)
    expect(puedeReasignarTarea(tarea, DESTINATARIO, todo)).toBe(false)
  })

  it('el creador edita y completa; reasigna sólo con asignar', () => {
    expect(puedeEditarTarea(tarea, CREADOR)).toBe(true)
    expect(puedeCompletarTarea(tarea, CREADOR)).toBe(true)
    expect(puedeReasignarTarea(tarea, CREADOR, con())).toBe(false)
    expect(puedeReasignarTarea(tarea, CREADOR, con('agenda.tareas.asignar'))).toBe(true)
  })

  it('un tercero, ni con ver_todo, no toca la tarea', () => {
    expect(puedeCompletarTarea(tarea, TERCERO)).toBe(false)
    expect(puedeEditarTarea(tarea, TERCERO)).toBe(false)
    expect(puedeReasignarTarea(tarea, TERCERO, todo)).toBe(false)
  })

  it('dar una tarea a otro pide asignar', () => {
    expect(puedeDarTareaAOtro(con())).toBe(false)
    expect(puedeDarTareaAOtro(con('agenda.tareas.asignar'))).toBe(true)
  })
})
