// Escribir eventos y tareas (7.07-2): lo que responden las RPC `evento_*` y `tarea_*` (7.06-1) y lo que el repositorio de cada uno sabe hacer.
// La respuesta de una RPC es un `jsonb` sin tipo: se **parsea** (Zod en todo límite). Un error vuelve como valor con el campo del formulario que lo
// causó (el `hint` de la base). Quién puede lo dice la base (42501); aquí no se decide nada.
import { z } from 'zod'
import { fallo, type ErrorApp } from '@/shared/lib/errores'
import type { DatosDeEvento, DatosDeTarea } from './edicion'

export type ResultadoDeEscritura = {
  // `creado`, `repetido` (el mismo intento otra vez: es éxito), `guardado`, `sin_cambios`, `eliminado`…: la pantalla no ramifica por él.
  resultado: string
  id: string
  // La versión nueva (`actualizado_en`) que pide la siguiente edición.
  actualizadoEn: string
}

export type FalloDeEscritura = { ok: false; error: ErrorApp; campo?: string }
export type RespuestaDeEscritura = Promise<
  { ok: true; data: ResultadoDeEscritura } | FalloDeEscritura
>

const esquemaDeRespuesta = z.object({
  resultado: z.string().min(1),
  id: z.guid(),
  actualizado_en: z.iso.datetime({ offset: true }),
})

// De lo que devolvió la RPC a un resultado, o un error si no tiene la forma esperada.
export function leerResultadoDeEscritura(
  datos: unknown,
): { ok: true; data: ResultadoDeEscritura } | FalloDeEscritura {
  const leido = esquemaDeRespuesta.safeParse(datos)
  if (!leido.success) {
    return fallo('inesperado', 'No pudimos confirmar que se guardó. Revisa la agenda.')
  }
  return {
    ok: true,
    data: {
      resultado: leido.data.resultado,
      id: leido.data.id,
      actualizadoEn: leido.data.actualizado_en,
    },
  }
}

export type RepositorioDeEventos = {
  // `id` es el del intento: repetirlo no crea dos eventos.
  crear: (pedido: {
    id: string
    datos: DatosDeEvento
    destinatarios: readonly string[]
  }) => RespuestaDeEscritura
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    datos: DatosDeEvento
    destinatarios: readonly string[]
  }) => RespuestaDeEscritura
  eliminar: (pedido: { id: string; actualizadoEnEsperado: string }) => RespuestaDeEscritura
}

export type RepositorioDeTareas = {
  crear: (pedido: { id: string; datos: DatosDeTarea }) => RespuestaDeEscritura
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    datos: DatosDeTarea
  }) => RespuestaDeEscritura
  eliminar: (pedido: { id: string; actualizadoEnEsperado: string }) => RespuestaDeEscritura
  // Poner, no alternar: repetirlo no cambia nada (`sin_cambios`). Sólo su creador o su responsable.
  completar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    completada: boolean
  }) => RespuestaDeEscritura
  // Sólo su creador, con `agenda.tareas.asignar`; quién puede recibir lo dice la base.
  reasignar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    responsableId: string
  }) => RespuestaDeEscritura
}
