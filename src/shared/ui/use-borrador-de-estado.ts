'use client'

import { useEffect, useRef } from 'react'
import {
  cambiosDeEstado,
  guardarBorradorDeEstado,
  leerBorradorDeEstado,
} from '@/shared/lib/borrador'
import { avisar } from './toasts'

type Args<Valores extends Record<string, unknown>> = {
  clave: string
  // El estado del formulario y lo guardado contra lo que se mide.
  valores: Valores
  guardado: Valores
  // Pone en el formulario lo que se había escrito (o lo guardado, al descartar).
  alReponer: (cambios: Partial<Valores>) => void
  // En falso no guarda ni repone: quien no puede editar no tiene nada que recuperar.
  activo?: boolean
}

// El borrador de un formulario controlado (`useBorrador` lee el DOM y sólo ve campos de texto).
// Guarda lo que la persona cambió y lo repone al volver a abrirlo, avisando con «Descartar».
export function useBorradorDeEstado<Valores extends Record<string, unknown>>(
  args: Args<Valores>,
): { limpiar: () => void } {
  const { clave, valores, guardado, alReponer, activo = true } = args
  const repuesto = useRef(false)
  const reponer = useRef(alReponer)
  const base = useRef(guardado)
  useEffect(() => {
    reponer.current = alReponer
    base.current = guardado
  })

  // Al abrir: lo que quedó sin guardar vuelve al formulario. Una clave que ya no existe (el
  // formulario cambió) o que ya coincide con lo guardado no se repone.
  useEffect(() => {
    if (!activo) {
      return
    }
    const borrador = leerBorradorDeEstado(window.sessionStorage, clave)
    const conocidas = Object.fromEntries(
      Object.entries(borrador ?? {}).filter(([campo]) => campo in base.current),
    )
    const pendientes = cambiosDeEstado(conocidas, base.current) as Partial<Valores>
    const claves = Object.keys(pendientes)
    if (claves.length > 0) {
      reponer.current(pendientes)
      avisar('Recuperamos lo que habías escrito y no guardaste.', {
        etiqueta: 'Descartar',
        alHacer: () => {
          guardarBorradorDeEstado(window.sessionStorage, clave, {})
          reponer.current(
            Object.fromEntries(
              claves.map((campo) => [campo, base.current[campo]]),
            ) as Partial<Valores>,
          )
        },
      })
    }
    repuesto.current = true
  }, [clave, activo])

  // Al escribir: se guarda sólo lo que difiere. La primera pasada no cuenta: todavía no se repuso.
  useEffect(() => {
    if (!activo || !repuesto.current) {
      return
    }
    guardarBorradorDeEstado(window.sessionStorage, clave, cambiosDeEstado(valores, guardado))
  }, [clave, valores, guardado, activo])

  return {
    // Después de guardar: lo escrito ya está en la base.
    limpiar: () => {
      guardarBorradorDeEstado(window.sessionStorage, clave, {})
    },
  }
}
