'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import { cambiarDisponibilidad } from '../actions/cambiar-disponibilidad'

// El interruptor de disponibilidad (8.05-2): el valor cambia al tocarlo y vuelve si la base no lo guardó, con el motivo debajo. Una escritura a la vez; no hay «Deshacer»,
// el mismo interruptor lo revierte.
export function useDisponibilidad(inicial: boolean) {
  const [valor, setValor] = useState(inicial)
  const [error, setError] = useState<string | null>(null)
  const { mandar, enCurso } = useUnEnvioALaVez()
  return {
    valor,
    error,
    enCurso,
    cambiar: async (nuevo: boolean) => {
      setError(null)
      setValor(nuevo)
      const envio = await mandar(() =>
        enviarAccion(cambiarDisponibilidad({ disponible: nuevo }), 'No pudimos guardarlo.'),
      )
      if (envio === null) {
        setValor(!nuevo)
      } else if (!envio.ok) {
        setValor(!nuevo)
        setError(envio.error.mensaje)
      }
    },
  }
}
