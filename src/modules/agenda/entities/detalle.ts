// El detalle de un evento o de una tarea, como lo lee el panel de `/agenda?evento=<id>` o `?tarea=<id>` (7.07-2). Puro: la forma, el mapeo de la fila de
// PostgREST (que ya pasó por la RLS de quien mira) y la ruta de cada vínculo. Las fechas cruzan como ISO. Los nombres de las personas se leen aparte
// (una consulta a `perfiles` por clave primaria) y entran por `nombres`.
import { z } from 'zod'
import type { Resultado } from '@/shared/lib/errores'
import type { OriginalDeTarea, PersonaElegida } from './edicion'
import type { Visibilidad } from './visibilidad'

export type ClaveDeVinculo = 'lead' | 'vehiculo' | 'cotizacion'

// A qué otra cosa del sistema apunta un evento o una tarea (nulo = a nada). Se muestran y no se editan en el panel (D7).
export type VinculosDeAgenda = Record<ClaveDeVinculo, string | null>

export type DetalleDeEvento = {
  id: string
  titulo: string
  descripcion: string | null
  lugar: string | null
  iniciaEn: string
  terminaEn: string | null
  visibilidad: Visibilidad
  estado: string
  creadoPor: string
  creadoPorNombre: string | null
  // Un evento «seleccionados» enseña sus destinatarios sólo a quien lo creó (D9); para el resto, nulo.
  destinatarios: PersonaElegida[] | null
  actualizadoEn: string
  vinculos: VinculosDeAgenda
}

export type DetalleDeTarea = {
  id: string
  titulo: string
  descripcion: string | null
  venceEn: string | null
  estado: string
  completadaEn: string | null
  responsableId: string
  responsableNombre: string | null
  creadoPor: string
  creadoPorNombre: string | null
  actualizadoEn: string
  vinculos: VinculosDeAgenda
}

// `null`: no existe, está eliminado o la RLS no deja verlo (el panel dice lo mismo en los tres casos, D10).
// `yo` es quien mira (decide si ve la lista de destinatarios).
export type LectorDeEvento = (id: string, yo: string) => Promise<Resultado<DetalleDeEvento | null>>
export type LectorDeTarea = (id: string) => Promise<Resultado<DetalleDeTarea | null>>

const SIN_NOMBRE = 'Alguien del equipo'

// Un id de la URL (`?evento=`, `?tarea=`): si no es un uuid se ignora y el panel no se abre.
export function leerIdDeUrl(valor: string | undefined): string | null {
  return z.guid().safeParse(valor).success ? (valor ?? null) : null
}

// La ruta de la ficha de cada vínculo (existen en `src/app/(app)`).
export function rutaDeVinculo(clave: ClaveDeVinculo, id: string): string {
  switch (clave) {
    case 'lead':
      return `/leads/${id}`
    case 'vehiculo':
      return `/vehiculos/${id}`
    case 'cotizacion':
      return `/cotizaciones/${id}`
  }
}

export type FilaDeEvento = {
  id: string
  titulo: string
  descripcion: string | null
  lugar: string | null
  inicia_en: string
  termina_en: string | null
  visibilidad: Visibilidad
  estado: string
  creado_por: string
  actualizado_en: string
  lead_id: string | null
  vehiculo_id: string | null
  cotizacion_id: string | null
}

export type FilaDeTarea = {
  id: string
  titulo: string
  descripcion: string | null
  vence_en: string | null
  estado: string
  completada_en: string | null
  responsable_id: string
  creado_por: string
  actualizado_en: string
  lead_id: string | null
  vehiculo_id: string | null
  cotizacion_id: string | null
}

type Nombres = Readonly<Record<string, string>>

export function detalleDeEventoDesde(
  fila: FilaDeEvento,
  nombres: Nombres,
  idsDeDestinatarios: readonly string[],
  yo: string,
): DetalleDeEvento {
  const esMio = fila.creado_por === yo
  return {
    id: fila.id,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    lugar: fila.lugar,
    iniciaEn: fila.inicia_en,
    terminaEn: fila.termina_en,
    visibilidad: fila.visibilidad,
    estado: fila.estado,
    creadoPor: fila.creado_por,
    creadoPorNombre: nombres[fila.creado_por] ?? null,
    destinatarios:
      esMio && fila.visibilidad === 'seleccionados'
        ? idsDeDestinatarios.map((id) => ({ id, nombre: nombres[id] ?? SIN_NOMBRE }))
        : null,
    actualizadoEn: fila.actualizado_en,
    vinculos: { lead: fila.lead_id, vehiculo: fila.vehiculo_id, cotizacion: fila.cotizacion_id },
  }
}

export function detalleDeTareaDesde(fila: FilaDeTarea, nombres: Nombres): DetalleDeTarea {
  return {
    id: fila.id,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    venceEn: fila.vence_en,
    estado: fila.estado,
    completadaEn: fila.completada_en,
    responsableId: fila.responsable_id,
    responsableNombre: nombres[fila.responsable_id] ?? null,
    creadoPor: fila.creado_por,
    creadoPorNombre: nombres[fila.creado_por] ?? null,
    actualizadoEn: fila.actualizado_en,
    vinculos: { lead: fila.lead_id, vehiculo: fila.vehiculo_id, cotizacion: fila.cotizacion_id },
  }
}

// De lo guardado a lo que el formulario edita.
export function originalDeTarea(detalle: DetalleDeTarea): OriginalDeTarea {
  return {
    titulo: detalle.titulo,
    descripcion: detalle.descripcion,
    venceEn: detalle.venceEn,
    responsable: { id: detalle.responsableId, nombre: detalle.responsableNombre ?? SIN_NOMBRE },
  }
}
