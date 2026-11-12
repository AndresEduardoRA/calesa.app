// Quién puede qué sobre un mensaje del hilo (7.09-4) y la cita de un mensaje respondido. Puro: la pantalla decide con esto lo que **ofrece**; la
// base (`mensaje_editar`, `mensaje_eliminar`) vuelve a exigir autor, ventana, versión y `chat.moderar`. Sin I/O.
import { z } from 'zod'
import { fallo } from '@/shared/lib/errores'
import type { FalloDeEscritura } from './escritura'
import type { CitaDeMensaje, Mensaje } from './mensajes'

// Igual que la base: `clock_timestamp() > creado_en + 15 minutes` ⇒ no se edita. Se cuenta desde la creación, no desde la última edición.
export const VENTANA_DE_EDICION_MINUTOS = 15

export const LARGO_DE_CITA = 120

const esVivo = (m: Mensaje) => m.estado === 'enviado' && m.eliminadoEn === null

// Sólo el autor, un texto, dentro de la ventana (el borde es inclusivo). `ahoraMs` es el reloj del navegador y sólo sirve para ofrecer.
export function puedeEditar(mensaje: Mensaje, yo: string, ahoraMs: number): boolean {
  return (
    esVivo(mensaje) &&
    mensaje.autorId === yo &&
    mensaje.tipo === 'texto' &&
    ahoraMs <= Date.parse(mensaje.creadoEn) + VENTANA_DE_EDICION_MINUTOS * 60_000
  )
}

// El autor, o quien modera. No hay ventana de borrado.
export function puedeBorrar(mensaje: Mensaje, yo: string, puedeModerar: boolean): boolean {
  return esVivo(mensaje) && (mensaje.autorId === yo || puedeModerar)
}

export function puedeResponder(mensaje: Mensaje): boolean {
  return esVivo(mensaje)
}

// Por qué un `?mensaje=` de la URL no se puede borrar (`null` = se puede). `mensaje` es nulo si no está entre los cargados.
export function motivoParaNoBorrar(
  mensaje: Mensaje | null,
  yo: string,
  puedeModerar: boolean,
): string | null {
  if (mensaje === null) {
    return 'Ese mensaje ya no está entre los cargados.'
  }
  if (mensaje.eliminadoEn !== null) {
    return 'Ese mensaje ya está eliminado.'
  }
  return puedeBorrar(mensaje, yo, puedeModerar) ? null : 'No puedes borrar este mensaje.'
}

// Lo que se dice de un mensaje respondido: sus primeras palabras, sin saltos ni espacios repetidos.
export function textoDeCita(cita: CitaDeMensaje): string {
  if (cita.eliminado) {
    return 'Mensaje eliminado'
  }
  if (cita.cuerpo === null) {
    return 'Mensaje no disponible'
  }
  const texto = cita.cuerpo.replace(/\s+/g, ' ').trim()
  return texto.length > LARGO_DE_CITA ? `${texto.slice(0, LARGO_DE_CITA)}…` : texto
}

export function citaDe(mensaje: Mensaje): CitaDeMensaje {
  return {
    id: mensaje.id,
    autorNombre: mensaje.autorNombre,
    cuerpo: mensaje.cuerpo,
    eliminado: mensaje.eliminadoEn !== null,
  }
}

export type ResultadoDeEdicion = {
  resultado: 'editado' | 'sin_cambios'
  id: string
  actualizadoEn: string
}

const esquemaDeEdicion = z.object({
  resultado: z.enum(['editado', 'sin_cambios']),
  id: z.guid(),
  actualizado_en: z.string().min(1),
})

// De lo que devolvió `mensaje_editar` al id y la versión nueva, o un error si no tiene la forma esperada.
export function leerResultadoDeEdicion(
  datos: unknown,
): { ok: true; data: ResultadoDeEdicion } | FalloDeEscritura {
  const leido = esquemaDeEdicion.safeParse(datos)
  if (!leido.success) {
    return fallo('inesperado', 'No pudimos confirmar el cambio. Revisa la conversación.')
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
