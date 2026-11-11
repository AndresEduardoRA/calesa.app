'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { enElTope } from '@/shared/lib/paginacion'
import { leerTareasSinFecha } from '../../../composicion.client'
import {
  cursorDeSinFecha,
  type PaginaDeSinFecha,
  type TareaSinFecha,
} from '../../../entities/sin-fecha'

const SIN_RED: ErrorApp = { codigo: 'inesperado', mensaje: 'No pudimos llegar al servidor.' }

// Lo cargado de «Tareas sin fecha»: la primera página se lee al montarse (la sección se monta al abrirla, y al cerrarla se descarta) y «Ver más» pide la que
// sigue al cursor de la última, hasta el tope. Un error de «Ver más» no pierde lo cargado; el de la primera lectura se reintenta con `reintentar`.
export function useTareasSinFecha() {
  const [tareas, setTareas] = useState<TareaSinFecha[]>([])
  const [hayMas, setHayMas] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<ErrorApp | null>(null)
  // Una lectura a la vez; y una página que llega tras desmontar o tras otra se descarta.
  const enVuelo = useRef(false)
  const vivo = useRef(true)

  const leer = useCallback(async (sumar: boolean, actuales: readonly TareaSinFecha[]) => {
    if (enVuelo.current) {
      return
    }
    enVuelo.current = true
    setCargando(true)
    setError(null)
    try {
      const leida = await leerTareasSinFecha(sumar ? cursorDeSinFecha(actuales) : null).catch(
        () => null,
      )
      if (!vivo.current) {
        return
      }
      if (!leida?.ok) {
        setError(leida?.error ?? SIN_RED)
        return
      }
      const pagina: PaginaDeSinFecha = leida.data
      setTareas(sumar ? [...actuales, ...pagina.tareas] : pagina.tareas)
      setHayMas(pagina.hayMas)
    } finally {
      enVuelo.current = false
      if (vivo.current) {
        setCargando(false)
      }
    }
  }, [])

  useEffect(() => {
    vivo.current = true
    void leer(false, [])
    return () => {
      vivo.current = false
    }
    // Sólo al montarse (`leer` no cambia): la lectura posterior es «Ver más» o «Reintentar».
  }, [leer])

  return {
    tareas,
    hayMas,
    cargando,
    error,
    enElTope: enElTope(tareas),
    verMas: () => void leer(true, tareas),
    reintentar: () => void leer(tareas.length > 0, tareas),
  }
}
