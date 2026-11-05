'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useRef, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { avisoDeCreada, type ResultadoDeEncima } from '../../../entities/resultado-de-encima'
import { rutaDeLaCotizacion } from '../../../entities/ruta-de-la-hoja'
import { cotizarEncima } from '../actions/cotizar-encima'

const MENSAJE_DE_VALIDACION = 'No se pudo cotizar encima.'
const PERDIDA: ResultadoDeEncima = { tipo: 'perdida' }

// «Cotizar encima» de una guardada: un envío a la vez, con un intento (el id de la nueva) que **sólo se conserva tras una pérdida**: reintentar devuelve la misma y no crea otra. Cualquier
// otra respuesta (también un rechazo) lo olvida, y el próximo toque lleva uno nuevo. Con la nueva creada avisa —lo descartado también, porque la página cambia— y navega a ella; el
// botón queda ocupado hasta que la navegación lo desmonte.
export function useCotizarEncima({ anterior }: { anterior: string }) {
  const router = useRouter()
  const ejecutar = useAction(cotizarEncima)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoDeEncima | null>(null)
  const intento = useRef<string | null>(null)
  const ocupado = useRef(false)

  const cotizar = async () => {
    if (ocupado.current) {
      return
    }
    ocupado.current = true
    setEnviando(true)
    setResultado(null)
    intento.current ??= crypto.randomUUID()
    const envio = await enviarAccion(
      ejecutar.executeAsync({ anterior, intento: intento.current }),
      MENSAJE_DE_VALIDACION,
    )
    // Lo que no llegó (sin red, un error del servidor) es una pérdida: no se sabe si entró.
    const obtenido = envio.ok ? envio.data : PERDIDA
    if (obtenido.tipo !== 'perdida') {
      intento.current = null
    }
    if (obtenido.tipo === 'creada') {
      avisarExito(avisoDeCreada(obtenido))
      router.push(rutaDeLaCotizacion(obtenido.id) as Route)
      return
    }
    setResultado(obtenido)
    setEnviando(false)
    ocupado.current = false
  }

  // «Recargar»: vuelve a pedir la página al servidor (la cotización cambió, o ya no se puede cotizar encima).
  const recargar = () => {
    setResultado(null)
    router.refresh()
  }

  return { enviando, resultado, cotizar, recargar }
}
