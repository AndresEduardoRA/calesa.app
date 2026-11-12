'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { fundirCabeza, fundirMensajes } from '../../../entities/mensajes'
import {
  esEnviado,
  leerElHilo,
  type Hilo,
  type LecturaDelHilo,
  type RespuestaDelHilo,
} from './hilo-leido'
import { useLocalesDelHilo } from './use-locales-del-hilo'
import { useRecorridoDelHilo } from './use-recorrido-del-hilo'
import { useSenalesDelHilo } from './use-senales-del-hilo'

type Props = { conversacion: string; zona: string }

// El estado del hilo de `/chat`: la cabeza (los 20 más nuevos) y la fusión por `id` de lo que avisa Realtime (la fila del canal es sólo señal: se
// relee la cabeza). Lo que se escribe y aún no llegó vive acá (`agregarLocal`, `resolver`) para que `useEnvio` no tenga su propio estado.
export function useHilo({ conversacion, zona }: Props) {
  const [hilo, setHilo] = useState<Hilo>({ mensajes: [], hayAnteriores: false })
  const [lectura, setLectura] = useState<LecturaDelHilo>('cargando')
  const [errorDeLectura, setErrorDeLectura] = useState<ErrorApp | null>(null)
  const [intento, setIntento] = useState(0)
  // Mirando desde una fecha, las señales no funden: el hilo no sigue lo nuevo.
  const desdeAhoraRef = useRef<string | null>(null)

  const aplicarCabeza = useCallback((respuesta: RespuestaDelHilo, reemplazar: boolean) => {
    if (!respuesta.ok) {
      // Sólo un hilo que nunca cargó dice el error; uno que ya se ve queda como está.
      setLectura((antes) => (antes === 'listo' ? antes : 'error'))
      setErrorDeLectura(respuesta.error)
      return
    }
    setErrorDeLectura(null)
    setLectura('listo')
    setHilo((antes) => ({
      mensajes: fundirMensajes(
        reemplazar ? antes.mensajes.filter((m) => !esEnviado(m)) : antes.mensajes,
        respuesta.data.mensajes,
      ),
      hayAnteriores: respuesta.data.hayMas,
    }))
  }, [])

  useEffect(() => {
    let vigente = true
    void leerElHilo({ conversacion, tamano: TAMANO_DE_VER_MAS }).then((respuesta) => {
      if (vigente) {
        aplicarCabeza(respuesta, false)
      }
    })
    return () => {
      vigente = false
    }
  }, [conversacion, intento, aplicarCabeza])

  const releerCabeza = useCallback(async () => {
    const mirandoDesdeUnaFecha = () => desdeAhoraRef.current !== null
    if (mirandoDesdeUnaFecha()) {
      return
    }
    const respuesta = await leerElHilo({ conversacion, tamano: TAMANO_DE_VER_MAS })
    // Un fallo de una señal deja lo que hay.
    if (!respuesta.ok || mirandoDesdeUnaFecha()) {
      return
    }
    setErrorDeLectura(null)
    setLectura('listo')
    setHilo((antes) =>
      fundirCabeza(
        antes.mensajes,
        respuesta.data.mensajes,
        respuesta.data.hayMas,
        antes.hayAnteriores,
      ),
    )
  }, [conversacion])
  useSenalesDelHilo(conversacion, releerCabeza)

  const recorrido = useRecorridoDelHilo({
    conversacion,
    zona,
    hilo,
    setHilo,
    desdeAhoraRef,
    volverACargarLaCabeza: async () => {
      aplicarCabeza(await leerElHilo({ conversacion, tamano: TAMANO_DE_VER_MAS }), true)
    },
  })

  const locales = useLocalesDelHilo(setHilo)

  return {
    ...recorrido,
    mensajes: hilo.mensajes,
    hayAnteriores: hilo.hayAnteriores,
    lectura,
    errorDeLectura,
    reintentar: () => {
      setLectura('cargando')
      setIntento((n) => n + 1)
    },
    ...locales,
    releer: releerCabeza,
  }
}
