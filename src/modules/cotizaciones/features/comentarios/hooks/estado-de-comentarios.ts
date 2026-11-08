// El estado de la lista de comentarios en la pantalla (4.27-2), puro: la primera página (con el día de «Ir a una fecha»), lo cargado y el «Ver más» en vuelo.
// Lo que llega de una lectura que otra ya reemplazó (otro `pedido`) se descarta.
import { MENSAJE_INESPERADO, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import type {
  PaginaDeComentarios,
  PaginaDeRespuestas,
} from '../../../entities/comentarios/comentario'
import {
  LISTA_VACIA,
  listaDesdePagina,
  sumarPaginaDeRaices,
  sumarPaginaDeRespuestas,
  type ListaDeComentarios,
} from '../../../entities/comentarios/lista'

// Dónde se pidió el último «Ver más»: las raíces o las respuestas de una raíz (su id).
export const RAICES = 'raices'

type Primera = { pedido: number; desde: string | null; leida: boolean; error: ErrorApp | null }

export type EstadoDeComentarios = {
  lista: ListaDeComentarios
  puedeModerar: boolean
  // Si ya se leyó alguna vez (lo que estaba se sigue viendo mientras se vuelve a leer).
  cargada: boolean
  primera: Primera
  // El «Ver más» en vuelo: `RAICES` o el id de una raíz. Uno a la vez.
  pidiendo: string | null
  fallo: { donde: string; error: ErrorApp } | null
}

export const ESTADO_INICIAL: EstadoDeComentarios = {
  lista: LISTA_VACIA,
  puedeModerar: false,
  cargada: false,
  primera: { pedido: 0, desde: null, leida: false, error: null },
  pidiendo: null,
  fallo: null,
}

export const caido = (): Resultado<never> => ({
  ok: false,
  error: { codigo: 'inesperado', mensaje: MENSAJE_INESPERADO },
})

// Volver a leer la primera página: lo más reciente (`dia` nulo) o ese día y lo anterior.
export function leerDesde(antes: EstadoDeComentarios, dia: string | null): EstadoDeComentarios {
  return {
    ...antes,
    primera: { pedido: antes.primera.pedido + 1, desde: dia, leida: false, error: null },
    pidiendo: null,
    fallo: null,
  }
}

export function conPrimera(
  antes: EstadoDeComentarios,
  pedido: number,
  resultado: Resultado<PaginaDeComentarios>,
): EstadoDeComentarios {
  if (antes.primera.pedido !== pedido) {
    return antes
  }
  return resultado.ok
    ? {
        ...antes,
        lista: listaDesdePagina(resultado.data),
        puedeModerar: resultado.data.puedeModerar,
        cargada: true,
        primera: { ...antes.primera, leida: true },
      }
    : { ...antes, primera: { ...antes.primera, error: resultado.error } }
}

export function conMas(
  antes: EstadoDeComentarios,
  deLaLectura: number,
  donde: string,
  resultado: Resultado<PaginaDeComentarios | PaginaDeRespuestas>,
): EstadoDeComentarios {
  if (antes.primera.pedido !== deLaLectura) {
    return antes
  }
  if (!resultado.ok) {
    return { ...antes, pidiendo: null, fallo: { donde, error: resultado.error } }
  }
  const lista =
    'comentarios' in resultado.data
      ? sumarPaginaDeRaices(antes.lista, resultado.data)
      : sumarPaginaDeRespuestas(antes.lista, donde, resultado.data)
  return { ...antes, lista, pidiendo: null }
}
