'use client'

import { useState, type Dispatch, type RefObject, type SetStateAction } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS, TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { bordeDelDia, cursorDeMensaje, fundirMensajes } from '../../../entities/mensajes'
import { esEnviado, leerElHilo, type Hilo } from './hilo-leido'

type Props = {
  conversacion: string
  zona: string
  hilo: Hilo
  setHilo: Dispatch<SetStateAction<Hilo>>
  // El día de «Ir a una fecha», visible para las señales (mirando desde ahí no funden).
  desdeAhoraRef: RefObject<string | null>
  volverACargarLaCabeza: () => Promise<void>
}

// Moverse por el hilo hacia atrás: «Ver anteriores» por cursor hasta el tope, «Ir a una fecha» («ese día y lo anterior») y volver a lo más
// reciente.
export function useRecorridoDelHilo({
  conversacion,
  zona,
  hilo,
  setHilo,
  desdeAhoraRef,
  volverACargarLaCabeza,
}: Props) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<ErrorApp | null>(null)
  const [desde, setDesde] = useState<string | null>(null)
  const enviados = hilo.mensajes.filter(esEnviado)
  const primero = enviados[0]

  const verAnteriores = async () => {
    if (!primero || cargando) {
      return
    }
    setCargando(true)
    setError(null)
    const respuesta = await leerElHilo({
      conversacion,
      antes: cursorDeMensaje(primero),
      tamano: Math.min(TAMANO_DE_VER_MAS, Math.max(TOPE_DE_LO_CARGADO - enviados.length, 1)),
    })
    setCargando(false)
    if (!respuesta.ok) {
      setError(respuesta.error)
      return
    }
    setHilo((antes) => ({
      mensajes: fundirMensajes(antes.mensajes, respuesta.data.mensajes),
      hayAnteriores: respuesta.data.hayMas,
    }))
  }

  // Reemplaza lo cargado por la página que termina ese día (lo pendiente se conserva).
  const irAUnaFecha = async (dia: string) => {
    setCargando(true)
    setError(null)
    const respuesta = await leerElHilo({
      conversacion,
      hasta: bordeDelDia(dia, zona),
      tamano: TAMANO_DE_VER_MAS,
    })
    setCargando(false)
    if (!respuesta.ok) {
      setError(respuesta.error)
      return
    }
    desdeAhoraRef.current = dia
    setDesde(dia)
    setHilo((antes) => ({
      mensajes: fundirMensajes(
        antes.mensajes.filter((m) => !esEnviado(m)),
        respuesta.data.mensajes,
      ),
      hayAnteriores: respuesta.data.hayMas,
    }))
  }

  const volverALoReciente = async () => {
    desdeAhoraRef.current = null
    setDesde(null)
    setError(null)
    await volverACargarLaCabeza()
  }

  return {
    cargandoAnteriores: cargando,
    errorAlCargarAnteriores: error,
    desde,
    enElTope: enviados.length >= TOPE_DE_LO_CARGADO,
    verAnteriores,
    irAUnaFecha,
    volverALoReciente,
  }
}
