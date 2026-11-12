'use client'

import type { Mensaje } from '../../../entities/mensajes'
import type { ContextoDeMenciones } from '../contexto-de-menciones'
import { useMencionPorUrl } from './use-mencion-por-url'
import { useReferenciasDelHilo } from './use-referencias-del-hilo'

// Todo lo de las menciones del hilo en un lugar: resolverlas, abrir una por la URL y lo que se le da a cada burbuja.
export function useMencionesDelHilo(mensajes: readonly Mensaje[]) {
  const url = useMencionPorUrl()
  const referencias = useReferenciasDelHilo({ mensajes, adicional: url.referencia })
  const menciones: ContextoDeMenciones = {
    estadoDe: referencias.estadoDe,
    reintentar: referencias.reintentar,
    abrir: url.abrir,
  }
  return { menciones, abierta: url.referencia, cerrar: url.cerrar }
}
