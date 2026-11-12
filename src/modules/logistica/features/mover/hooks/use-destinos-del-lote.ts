'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { destinosDeLaFase, type DestinoDeMover } from '@/modules/flujos/client'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'

const NO_SE_LEYERON_LOS_DESTINOS = 'No pudimos leer a dónde se puede mover.'

export type LecturaDeDestinos =
  | { tipo: 'cargando' }
  | { tipo: 'error'; error: ErrorApp }
  | { tipo: 'listo'; destinos: DestinoDeMover[]; hayMas: boolean }

// A dónde se puede mover desde la fase del lote (6.04-3): una lectura al abrir el drawer, no una por unidad. Una respuesta tardía se descarta; «Reintentar» vuelve a pedirla.
export function useDestinosDelLote(origenId: string, faseId: string) {
  const [lectura, setLectura] = useState<LecturaDeDestinos>({ tipo: 'cargando' })
  const pedido = useRef(0)
  const leer = useCallback(async () => {
    pedido.current += 1
    const mio = pedido.current
    const envio = await enviarAccion<{ destinos: DestinoDeMover[]; hayMas: boolean }>(
      destinosDeLaFase({ origenId, faseId }),
      NO_SE_LEYERON_LOS_DESTINOS,
    )
    if (mio !== pedido.current) return
    setLectura(envio.ok ? { tipo: 'listo', ...envio.data } : { tipo: 'error', error: envio.error })
  }, [origenId, faseId])
  useEffect(() => {
    void leer()
    return () => {
      pedido.current += 1
    }
  }, [leer])
  return {
    lectura,
    reintentar: () => {
      setLectura({ tipo: 'cargando' })
      void leer()
    },
  }
}
