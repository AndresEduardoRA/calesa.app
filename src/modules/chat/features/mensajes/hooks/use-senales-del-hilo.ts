'use client'

import { useEffect } from 'react'
import { suscribirseAlHilo } from '../../../composicion.client'

// Una ráfaga de señales es una sola relectura de la cabeza.
const ESPERA_DE_LA_SENAL_MS = 250

// Cada señal de Realtime del hilo (con una ráfaga unida en una) relee la cabeza; también al unirse el canal y al volver a la pestaña.
export function useSenalesDelHilo(conversacion: string, releerCabeza: () => Promise<void>) {
  useEffect(() => {
    let espera: ReturnType<typeof setTimeout> | null = null
    const programar = () => {
      if (espera) {
        clearTimeout(espera)
      }
      espera = setTimeout(() => {
        espera = null
        void releerCabeza()
      }, ESPERA_DE_LA_SENAL_MS)
    }
    const desuscribir = suscribirseAlHilo(conversacion, {
      alCambiar: programar,
      alReconectar: programar,
    })
    return () => {
      desuscribir()
      if (espera) {
        clearTimeout(espera)
      }
    }
  }, [conversacion, releerCabeza])
}
