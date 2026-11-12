'use client'

import { useEffect, useState } from 'react'
import type { Buscar, OpcionDelBuscador } from './tipos-del-buscador'

export type EstadoDeLaBusqueda =
  | { tipo: 'quieto' }
  | { tipo: 'buscando' }
  | { tipo: 'listo'; opciones: OpcionDelBuscador[] }
  | { tipo: 'error' }

export const ESPERA_DE_LA_BUSQUEDA_MS = 250

type Args = {
  // Lo que se busca, ya interpretado; nulo = no alcanza y no se llama a la base.
  texto: string | null
  buscar: Buscar
  // Cambia para repetir la misma búsqueda («Reintentar»).
  intento: number
}

// Pide al escribir, de a una búsqueda: espera `ESPERA_DE_LA_BUSQUEDA_MS`, cancela la anterior y descarta su respuesta mirando su `signal` (la lectura no lanza al cancelar: D14 del
// buscador). `reiniciar` vuelve a «quieto» (el texto cambió o se eligió).
export function useBusquedaCancelable({ texto, buscar, intento }: Args) {
  const [estado, setEstado] = useState<EstadoDeLaBusqueda>({ tipo: 'quieto' })
  useEffect(() => {
    if (texto === null) {
      return
    }
    const control = new AbortController()
    const espera = setTimeout(() => {
      setEstado({ tipo: 'buscando' })
      void buscar(texto, control.signal).then((respuesta) => {
        if (control.signal.aborted) {
          return
        }
        setEstado(respuesta.ok ? { tipo: 'listo', opciones: respuesta.data } : { tipo: 'error' })
      })
    }, ESPERA_DE_LA_BUSQUEDA_MS)
    return () => {
      clearTimeout(espera)
      control.abort()
    }
  }, [texto, buscar, intento])
  return { estado, reiniciar: () => setEstado({ tipo: 'quieto' }) }
}
