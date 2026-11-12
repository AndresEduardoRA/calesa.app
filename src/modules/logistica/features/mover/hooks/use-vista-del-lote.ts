'use client'

import { useEffect, useState } from 'react'
import { previsualizarCambioLote, type VistaPreviaDeUnaUnidad } from '@/modules/flujos/client'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'

const NO_SE_REVISO_EL_LOTE = 'No pudimos revisar lo que falta a cada unidad.'

export type LecturaDeLaVista =
  | { tipo: 'sin_destino' }
  | { tipo: 'cargando' }
  | { tipo: 'error'; error: ErrorApp }
  | { tipo: 'listo'; vistas: VistaPreviaDeUnaUnidad[] }

type Leida = {
  clave: string
  lectura: { tipo: 'error'; error: ErrorApp } | { tipo: 'listo'; vistas: VistaPreviaDeUnaUnidad[] }
}

// La vista previa del lote hacia un destino (6.04-3): una sola llamada con hasta 200 ids (`previsualizar_cambio_fase_lote`), nunca una por unidad. Cambiar el destino o las unidades relee y,
// mientras la respuesta de otro pedido no llega, se ve «cargando»; una respuesta que llega tarde se descarta. Sin destino no se pide nada.
export function useVistaDelLote(destinoId: string | null, ids: readonly string[]) {
  const [intento, setIntento] = useState(0)
  const [leida, setLeida] = useState<Leida | null>(null)
  const idsJuntos = ids.join(',')
  const clave = destinoId === null ? null : `${destinoId}|${idsJuntos}|${String(intento)}`
  useEffect(() => {
    if (destinoId === null || clave === null) return
    let vigente = true
    void enviarAccion<VistaPreviaDeUnaUnidad[]>(
      previsualizarCambioLote({ fase: destinoId, vehiculos: idsJuntos.split(',') }),
      NO_SE_REVISO_EL_LOTE,
    ).then((envio) => {
      if (!vigente) return
      setLeida({
        clave,
        lectura: envio.ok
          ? { tipo: 'listo', vistas: envio.data }
          : { tipo: 'error', error: envio.error },
      })
    })
    return () => {
      vigente = false
    }
  }, [destinoId, idsJuntos, clave])
  const lectura: LecturaDeLaVista =
    clave === null
      ? { tipo: 'sin_destino' }
      : leida?.clave === clave
        ? leida.lectura
        : { tipo: 'cargando' }
  return {
    lectura,
    reintentar: () => {
      setIntento((n) => n + 1)
    },
  }
}
