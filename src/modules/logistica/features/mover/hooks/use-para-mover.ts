'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { leerParaMover, type ParaMover } from '@/modules/flujos/client'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { NO_SE_LEYO_QUE_FALTA } from '../../../entities/mover/textos'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { useAlCambiarLaUnidad } from '../../nucleo/hooks/eventos-de-la-unidad'

export type LecturaParaMover =
  { tipo: 'cargando' } | { tipo: 'error'; error: ErrorApp } | { tipo: 'listo'; dato: ParaMover }

// Entre una lectura y la siguiente por volver el foco a la ventana pasan al menos 5 segundos: cambiar de pestaña no debe pegarle a la base cada vez.
const MINIMO_ENTRE_LECTURAS_MS = 5000

// Lo que el hueco «Qué falta» lee de una unidad (6.04): se lee al montarse, cuando cambia su fase (la pantalla se repintó), cuando otro hueco avisa que cambió algo y cuando vuelve el foco a la
// ventana. Una relectura no vuelve al esqueleto: lo que había se sigue viendo y `actualizando` lo dice. «Reintentar» pasa por «cargando». Una respuesta que llega tarde se descarta.
export function useParaMover(unidad: Unidad) {
  const [lectura, setLectura] = useState<LecturaParaMover>({ tipo: 'cargando' })
  const [actualizando, setActualizando] = useState(false)
  const pedido = useRef(0)
  const ultimaLectura = useRef(0)
  const { id, origenId } = unidad

  const leer = useCallback(async () => {
    pedido.current += 1
    const mio = pedido.current
    ultimaLectura.current = Date.now()
    const envio = await enviarAccion<ParaMover>(
      leerParaMover({ vehiculo: id, origenId }),
      NO_SE_LEYO_QUE_FALTA,
    )
    if (mio !== pedido.current) return
    setActualizando(false)
    setLectura(
      envio.ok ? { tipo: 'listo', dato: envio.data } : { tipo: 'error', error: envio.error },
    )
  }, [id, origenId])

  // Se vuelve a leer sin soltar lo que se ve.
  const releer = useCallback(() => {
    setActualizando(true)
    void leer()
  }, [leer])

  useEffect(() => {
    void leer()
    return () => {
      pedido.current += 1
    }
    // La fase de la unidad cambia cuando la pantalla se repinta tras mover: hay que leer de nuevo.
  }, [leer, unidad.faseId])

  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'hidden') return
      if (Date.now() - ultimaLectura.current < MINIMO_ENTRE_LECTURAS_MS) return
      releer()
    }
    window.addEventListener('focus', alVolver)
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      window.removeEventListener('focus', alVolver)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [releer])

  useAlCambiarLaUnidad(id, releer)

  return {
    lectura,
    actualizando,
    releer,
    reintentar: () => {
      setLectura({ tipo: 'cargando' })
      void leer()
    },
  }
}
