'use client'

import { useState } from 'react'
import { fallo, type ErrorApp } from '@/shared/lib/errores'
import { avisarError } from '@/shared/ui/toasts'
import { subirComprobante, urlDelComprobante } from '../../../areas/dinero/composicion.client'

// Subir y ver el comprobante de un gasto (6.11-1): el archivo se sube al elegirlo y la ruta vuelve a quien lo usa; «Ver» abre una URL firmada de 60 s.
export function useComprobante(unidadId: string, ruta: string, alCambiar: (ruta: string) => void) {
  const [subiendo, setSubiendo] = useState(false)
  const [rechazo, setRechazo] = useState<ErrorApp | null>(null)

  async function elegir(archivo: File | undefined) {
    if (!archivo) {
      return
    }
    setRechazo(null)
    setSubiendo(true)
    const resultado = await subirComprobante(unidadId, archivo).catch(() =>
      fallo('inesperado', 'No se pudo subir el comprobante. Prueba de nuevo.'),
    )
    setSubiendo(false)
    if (resultado.ok) {
      alCambiar(resultado.data)
    } else {
      setRechazo(resultado.error)
    }
  }

  async function ver() {
    const resultado = await urlDelComprobante(ruta).catch(() =>
      fallo('inesperado', 'No se pudo abrir el comprobante. Prueba de nuevo.'),
    )
    if (resultado.ok) {
      window.open(resultado.data, '_blank', 'noopener,noreferrer')
    } else {
      avisarError(resultado.error)
    }
  }

  return { subiendo, rechazo: rechazo?.mensaje ?? null, elegir, ver }
}
