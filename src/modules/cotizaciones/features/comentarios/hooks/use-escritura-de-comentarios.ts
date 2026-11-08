'use client'

import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { MENSAJE_SIN_CONEXION } from '@/shared/lib/errores'
import type { Comentario, ResultadoDeBorrar } from '../../../entities/comentarios/comentario'
import {
  aplicarBorrado,
  reemplazarComentario,
  sumarComentario,
  type ListaDeComentarios,
} from '../../../entities/comentarios/lista'
import { borrarComentario } from '../actions/borrar-comentario'
import { comentarCotizacion } from '../actions/comentar'
import { editarComentario } from '../actions/editar-comentario'
import { MENSAJE_DEL_CUERPO } from '../schemas/comentarios'

type Aplicar = (cambio: (lista: ListaDeComentarios) => ListaDeComentarios) => void

// Sin red y sin conexión en el navegador, se dice eso; si no, lo que respondió el envío.
function conConexion<T>(envio: Envio<T>): Envio<T> {
  if (!envio.ok && 'sinRed' in envio && !window.navigator.onLine) {
    return { ...envio, error: { ...envio.error, mensaje: MENSAJE_SIN_CONEXION } }
  }
  return envio
}

// Comentar, responder, editar y borrar (4.27-2), por las actions y sin `useAction` (cada campo lleva su «en curso»). Lo que la base devuelve se aplica a la
// lista cargada (`entities/comentarios/lista.ts`); lo que rechaza vuelve para que el campo o el diálogo lo diga.
export function useEscrituraDeComentarios(cotizacionId: string, aplicar: Aplicar) {
  return {
    comentar: async (cuerpo: string, padreId: string | null): Promise<Envio<Comentario>> => {
      const envio = conConexion(
        await enviarAccion<Comentario>(
          comentarCotizacion({ cotizacionId, padreId, cuerpo }),
          MENSAJE_DEL_CUERPO,
        ),
      )
      if (envio.ok) {
        aplicar((lista) => sumarComentario(lista, envio.data, padreId))
      }
      return envio
    },
    editar: async (comentario: Comentario, cuerpo: string): Promise<Envio<Comentario>> => {
      const envio = conConexion(
        await enviarAccion<Comentario>(
          editarComentario({
            comentarioId: comentario.id,
            actualizadoEnEsperado: comentario.actualizadoEn,
            cuerpo,
          }),
          MENSAJE_DEL_CUERPO,
        ),
      )
      if (envio.ok) {
        aplicar((lista) => reemplazarComentario(lista, envio.data))
      }
      return envio
    },
    borrar: async (comentario: Comentario): Promise<Envio<{ resultado: ResultadoDeBorrar }>> => {
      const envio = conConexion(
        await enviarAccion<{ resultado: ResultadoDeBorrar }>(
          borrarComentario({
            comentarioId: comentario.id,
            actualizadoEnEsperado: comentario.actualizadoEn,
          }),
          'No se pudo borrar.',
        ),
      )
      if (envio.ok) {
        aplicar((lista) => aplicarBorrado(lista, comentario.id, envio.data.resultado))
      }
      return envio
    },
  }
}

export type EscrituraDeComentarios = ReturnType<typeof useEscrituraDeComentarios>
