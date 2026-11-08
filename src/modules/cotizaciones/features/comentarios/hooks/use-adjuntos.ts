'use client'

import { useCallback, useEffect, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import {
  leerAdjuntos,
  NO_SE_CARGARON_LOS_ADJUNTOS,
  urlDeDescarga,
} from '../../../areas/comentarios/composicion.client'
import { TOPE_DE_ADJUNTOS, type Adjunto } from '../../../entities/comentarios/adjunto'

type Estado = { lista: Adjunto[]; cargada: boolean; error: ErrorApp | null; pedido: number }

const caido = (): Resultado<never> => fallo('inesperado', NO_SE_CARGARON_LOS_ADJUNTOS)

// Los adjuntos de una cotización, leídos una vez al montarse la sección de comentarios (4.27-3): a lo sumo 21, sin páginas. Lo que se sube o se quita se aplica a
// lo cargado; «Reintentar» vuelve a leer.
export function useAdjuntos(cotizacionId: string) {
  const [estado, setEstado] = useState<Estado>({
    lista: [],
    cargada: false,
    error: null,
    pedido: 0,
  })
  const porLeer = !estado.cargada && estado.error === null
  const { pedido } = estado
  useEffect(() => {
    if (!porLeer) {
      return
    }
    let vigente = true
    leerAdjuntos(cotizacionId)
      .catch(caido)
      .then((resultado) => {
        if (vigente) {
          setEstado((antes) =>
            antes.pedido !== pedido
              ? antes
              : resultado.ok
                ? { ...antes, lista: resultado.data, cargada: true }
                : { ...antes, error: resultado.error },
          )
        }
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [porLeer, pedido, cotizacionId])

  return {
    lista: estado.lista,
    cargada: estado.cargada,
    errorDeLectura: estado.error,
    enElTope: estado.lista.length >= TOPE_DE_ADJUNTOS,
    reintentar: () => {
      setEstado((antes) => ({ ...antes, cargada: false, error: null, pedido: antes.pedido + 1 }))
    },
    // El recién registrado va primero (es el más nuevo), sin repetir un id.
    agregar: useCallback((adjunto: Adjunto) => {
      setEstado((antes) => ({
        ...antes,
        lista: [adjunto, ...antes.lista.filter((a) => a.id !== adjunto.id)],
      }))
    }, []),
    sacar: (id: string) => {
      setEstado((antes) => ({ ...antes, lista: antes.lista.filter((a) => a.id !== id) }))
    },
  }
}

export type Adjuntos = ReturnType<typeof useAdjuntos>

// Pide la URL firmada y la abre: la respuesta trae `Content-Disposition: attachment` con el nombre, así que baja sin salir de la página.
export async function descargarAdjunto(adjunto: Adjunto): Promise<ErrorApp | null> {
  const url = await urlDeDescarga(adjunto).catch(() =>
    fallo('inesperado', 'No se pudo descargar el archivo. Prueba de nuevo.'),
  )
  if (!url.ok) {
    return url.error
  }
  const enlace = document.createElement('a')
  enlace.href = url.data
  enlace.download = adjunto.nombre
  enlace.rel = 'noopener'
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  return null
}
