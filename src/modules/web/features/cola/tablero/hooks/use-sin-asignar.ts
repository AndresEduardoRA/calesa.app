'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { enElTope } from '@/shared/lib/paginacion'
import { leerMasSinAsignar } from '../../../../areas/cola/client'
import {
  cursorDeSolicitudes,
  type PaginaDeSolicitudes,
  type SolicitudSinAsignar,
} from '../../../../entities/cola/solicitudes'

const SIN_RED: ErrorApp = { codigo: 'inesperado', mensaje: 'No pudimos llegar al servidor.' }

// Lo cargado de «Sin asignar»: la primera página llega del servidor y «Ver más» pide la que sigue al cursor de la última, hasta el tope. Un error de
// «Ver más» no pierde lo cargado. «Actualizar» trae otra primera página y la lista se vuelve a montar (`key` con su firma): lo traído se descarta.
export function useSinAsignar(primera: PaginaDeSolicitudes) {
  const [solicitudes, setSolicitudes] = useState<SolicitudSinAsignar[]>(primera.solicitudes)
  const [hayMas, setHayMas] = useState(primera.hayMas)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<ErrorApp | null>(null)
  // Una lectura a la vez; y una página que llega tras desmontar se descarta.
  const enVuelo = useRef(false)
  const vivo = useRef(true)

  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
    }
  }, [])

  const verMas = useCallback(async (actuales: readonly SolicitudSinAsignar[]) => {
    if (enVuelo.current) {
      return
    }
    enVuelo.current = true
    setCargando(true)
    setError(null)
    try {
      const leida = await leerMasSinAsignar(cursorDeSolicitudes(actuales)).catch(() => null)
      if (!vivo.current) {
        return
      }
      if (!leida?.ok) {
        setError(leida?.error ?? SIN_RED)
        return
      }
      setSolicitudes([...actuales, ...leida.data.solicitudes])
      setHayMas(leida.data.hayMas)
    } finally {
      enVuelo.current = false
      if (vivo.current) {
        setCargando(false)
      }
    }
  }, [])

  return {
    solicitudes,
    hayMas,
    cargando,
    error,
    enElTope: enElTope(solicitudes),
    verMas: () => void verMas(solicitudes),
  }
}
