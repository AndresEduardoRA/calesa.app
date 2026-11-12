// Quién ve y quién cambia un evento o una tarea de la agenda (paso 7.06-2): espejo de la base para habilitar o deshabilitar en la pantalla, nunca la
// autoridad. Quien decide es la base: `eventos: leer` (en línea), `evento_*`, `tarea_*` y `reasignar_tarea` (7.06-1). Sin roles: todo por `puede()`.
//
// Lo que no se espeja: que una tarea nacida en el chat sólo vaya a miembros de esa conversación (D3) y que quien la recibe esté activo, sin bloqueo y
// con agenda.tareas.recibir. Eso lo dicen la base y `agenda_quienes_reciben`.
import { puede, type Permisos } from '@/shared/lib/permisos'
import type { Enums } from '@/shared/types/database.types'

export type Visibilidad = Enums<'visibilidad_evento'>

// Como mucho, destinatarios de un evento «seleccionados» (`_agenda_destinatarios_validar`).
export const TOPE_DE_DESTINATARIOS = 50

// Como mucho, días de un rango de `agenda_rango`.
export const DIAS_MAXIMOS_DEL_RANGO = 45

export type EventoParaPermisos = {
  creadoPor: string
  visibilidad: Visibilidad
  eliminado: boolean
}

export type TareaParaPermisos = {
  creadoPor: string
  responsableId: string
}

// Espejo de `eventos: leer`: vivo y (creador, público, destinatario o agenda.ver_todo).
export function puedeVerEvento(
  evento: EventoParaPermisos,
  yo: string,
  permisos: Permisos,
  soyDestinatario: boolean,
): boolean {
  if (evento.eliminado) {
    return false
  }
  return (
    evento.creadoPor === yo ||
    evento.visibilidad === 'publico' ||
    soyDestinatario ||
    puede(permisos, 'agenda.ver_todo')
  )
}

// Si guardar pide agenda.eventos.publicar: el evento era o queda público o «seleccionados» (D18). `antes` es nulo al crear.
export function exigePublicar(antes: Visibilidad | null, despues: Visibilidad): boolean {
  return (antes !== null && antes !== 'privado') || despues !== 'privado'
}

// Si quien edita puede elegir esa visibilidad (las otras se muestran deshabilitadas con motivo).
export function puedeElegirVisibilidad(visibilidad: Visibilidad, permisos: Permisos): boolean {
  return visibilidadElegible(visibilidad, puede(permisos, 'agenda.eventos.publicar'))
}

// Lo mismo con el permiso ya resuelto: lo usa el formulario del navegador, que recibe un booleano y no los permisos.
export function visibilidadElegible(visibilidad: Visibilidad, puedePublicar: boolean): boolean {
  return visibilidad === 'privado' || puedePublicar
}

// Editar y eliminar un evento (D16): sólo su creador y, si está publicado, con agenda.eventos.publicar.
export function puedeEditarEvento(
  evento: EventoParaPermisos,
  yo: string,
  permisos: Permisos,
): boolean {
  return (
    evento.creadoPor === yo &&
    (evento.visibilidad === 'privado' || puede(permisos, 'agenda.eventos.publicar'))
  )
}

// Editar y eliminar una tarea (D2): sólo su creador.
export function puedeEditarTarea(tarea: TareaParaPermisos, yo: string): boolean {
  return tarea.creadoPor === yo
}

// Completar y reabrir una tarea (D2): su creador o su responsable.
export function puedeCompletarTarea(tarea: TareaParaPermisos, yo: string): boolean {
  return tarea.creadoPor === yo || tarea.responsableId === yo
}

// Reasignar una tarea (D2): su creador, con agenda.tareas.asignar.
export function puedeReasignarTarea(
  tarea: TareaParaPermisos,
  yo: string,
  permisos: Permisos,
): boolean {
  return tarea.creadoPor === yo && puede(permisos, 'agenda.tareas.asignar')
}

// Dar una tarea a otra persona (y buscar a quién): agenda.tareas.asignar. Para sí mismo no hace falta.
export function puedeDarTareaAOtro(permisos: Permisos): boolean {
  return puede(permisos, 'agenda.tareas.asignar')
}
