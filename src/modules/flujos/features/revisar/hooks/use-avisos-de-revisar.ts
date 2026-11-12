'use client'

import { useEffect, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import type { AvisoDeRevision } from '../../../entities/revisar/avisos'
import { leerAvisosDeRevisar } from '../actions/leer-avisos-de-revisar'

type Leido = { avisos: AvisoDeRevision[]; hayMas: boolean }
type Respuesta = { pedido: string; error: ErrorApp | null }

const NO_SE_LEYO = 'No pudimos revisar el flujo.'

// Los avisos de «Revisar» de un flujo: se leen al montar y otra vez cada vez que cambia la versión del flujo (cada guardado revalida la ruta y la pantalla
// entrega el flujo con la versión nueva). Mientras relee **conserva lo último leído**, para que la franja no vuelva al esqueleto en cada guardado; una
// respuesta de un pedido viejo se descarta. Sin memoria entre montajes: el resultado cambia con cada guardado.
export function useAvisosDeRevisar(flujo: FlujoParaConfigurar) {
  const { id, ambito, version } = flujo
  const [leido, setLeido] = useState<Leido | null>(null)
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null)
  const [intento, setIntento] = useState(0)
  const pedido = `${id}:${version}:${String(intento)}`

  useEffect(() => {
    let vigente = true
    const este = `${id}:${version}:${String(intento)}`
    void enviarAccion<Leido>(leerAvisosDeRevisar({ flujoId: id, ambito }), NO_SE_LEYO).then(
      (envio) => {
        if (!vigente) {
          return
        }
        if (envio.ok) {
          setLeido(envio.data)
        }
        setRespuesta({ pedido: este, error: envio.ok ? null : envio.error })
      },
    )
    return () => {
      vigente = false
    }
  }, [id, ambito, version, intento])

  const vigente = respuesta !== null && respuesta.pedido === pedido
  const error = vigente ? respuesta.error : null
  return {
    estado:
      leido !== null
        ? ('leido' as const)
        : error !== null
          ? ('fallo' as const)
          : ('leyendo' as const),
    avisos: leido?.avisos ?? [],
    hayMas: leido?.hayMas ?? false,
    error,
    releyendo: leido !== null && !vigente,
    reintentar: () => {
      setIntento((n) => n + 1)
    },
  }
}
