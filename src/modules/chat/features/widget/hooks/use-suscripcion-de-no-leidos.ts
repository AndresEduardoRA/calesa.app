'use client'

import { useEffect } from 'react'
import { leerNoLeidos, suscribirseALaLista } from '../../../composicion.client'
import { noLeidosStore } from '../no-leidos-store'

// Una ráfaga de señales (varios mensajes, las dos tablas a la vez) es una sola relectura.
const ESPERA_DE_LA_SENAL_MS = 250

// Lee `chat_no_leidos` al montar y tras cada señal de la lista (con una ráfaga unida en una) y al reconectar. Un fallo, o una lectura vieja que
// llega después de otra más nueva, no mueve el contador: queda el último valor bueno.
export function useSuscripcionDeNoLeidos(usuarioId: string) {
  useEffect(() => {
    let vigente = true
    let pedidos = 0
    let espera: ReturnType<typeof setTimeout> | null = null
    const leer = async () => {
      pedidos += 1
      const este = pedidos
      try {
        const lectura = await leerNoLeidos()
        if (vigente && este === pedidos && lectura.ok) {
          noLeidosStore.poner(lectura.data)
        }
      } catch {
        // Sin red: queda el último valor.
      }
    }
    const programar = () => {
      if (espera) {
        clearTimeout(espera)
      }
      espera = setTimeout(() => {
        espera = null
        void leer()
      }, ESPERA_DE_LA_SENAL_MS)
    }
    void leer()
    const desuscribir = suscribirseALaLista(usuarioId, {
      alCambiar: programar,
      alReconectar: programar,
    })
    return () => {
      vigente = false
      desuscribir()
      if (espera) {
        clearTimeout(espera)
      }
    }
  }, [usuarioId])
}
