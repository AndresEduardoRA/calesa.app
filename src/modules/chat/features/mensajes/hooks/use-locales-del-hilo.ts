'use client'

import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { aplicarResultado, type Mensaje, type ResultadoDelEnvio } from '../../../entities/mensajes'
import type { Hilo } from './hilo-leido'

// Lo que se escribe y aún no llegó: se agrega al final y se resuelve por su `id` (llegó, falló o se reintenta).
export function useLocalesDelHilo(setHilo: Dispatch<SetStateAction<Hilo>>) {
  const agregarLocal = useCallback(
    (mensaje: Mensaje) => {
      setHilo((antes) => ({ ...antes, mensajes: [...antes.mensajes, mensaje] }))
    },
    [setHilo],
  )
  const resolver = useCallback(
    (id: string, resultado: ResultadoDelEnvio) => {
      setHilo((antes) => ({ ...antes, mensajes: aplicarResultado(antes.mensajes, id, resultado) }))
    },
    [setHilo],
  )
  return { agregarLocal, resolver }
}
