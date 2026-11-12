'use client'

import { useEffect, useState } from 'react'
import { MENSAJE_INESPERADO, type ErrorApp } from '@/shared/lib/errores'
import type { Notificacion } from '../../../entities/notificacion'
import { leerNotificacionesParaLaCampana } from '../../../composicion.client'

export type AvisosDeLaCampana =
  | { estado: 'leyendo'; filas: null }
  | { estado: 'listo'; filas: Notificacion[]; hayMas: boolean }
  | { estado: 'error'; filas: null; error: ErrorApp }

const LEYENDO: AvisosDeLaCampana = { estado: 'leyendo', filas: null }

// Lo del popover: se lee al abrirlo y de nuevo con cada señal (`version`) o «Reintentar». Mientras relee deja
// a la vista lo que ya había: nada de esqueleto cada vez que llega un aviso.
export function useAvisosDeLaCampana(version: number) {
  const [avisos, setAvisos] = useState<AvisosDeLaCampana>(LEYENDO)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vigente = true
    void leerNotificacionesParaLaCampana()
      .then((lectura): AvisosDeLaCampana => {
        if (lectura.ok) {
          return { estado: 'listo', filas: lectura.data.filas, hayMas: lectura.data.hayMas }
        }
        return { estado: 'error', filas: null, error: lectura.error }
      })
      .catch((): AvisosDeLaCampana => ({
        estado: 'error',
        filas: null,
        error: { codigo: 'inesperado', mensaje: MENSAJE_INESPERADO },
      }))
      .then((lectura) => {
        if (vigente) {
          setAvisos(lectura)
        }
      })
    return () => {
      vigente = false
    }
  }, [version, intento])

  return {
    avisos,
    reintentar: () => {
      setAvisos(LEYENDO)
      setIntento((n) => n + 1)
    },
  }
}
