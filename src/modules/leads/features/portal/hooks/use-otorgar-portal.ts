'use client'

import { useAction } from 'next-safe-action/hooks'
import { useEffect, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { motivoDeClave, type AccesoOtorgado } from '../../../entities/portal'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { otorgarPortal } from '../actions/otorgar-portal'

// Lo que se muestra una sola vez: el código y la clave (la escrita o la generada; la generada, sólo con
// símbolos que se dictan, se dice símbolo por símbolo).
export type Otorgado = AccesoOtorgado & { clave: string; generada: boolean }

type Estado = { otorgado: Otorgado | null; error: ErrorApp | null; motivo: string | null }

const INICIAL: Estado = { otorgado: null, error: null, motivo: null }

// Dar o volver a otorgar el acceso. La clave vive sólo en este estado: no va a la URL, no se escribe en
// `console` ni en el almacenamiento del navegador, y se olvida al cerrar el diálogo y cuando Next
// esconde la pantalla (al navegar a otra, el árbol queda guardado: el efecto se limpia y la borra).
export function useOtorgarPortal({
  leadId,
  version,
  abierto,
}: {
  leadId: string
  // La versión del acceso que la persona ve (nula si no hay).
  version: string | null
  abierto: boolean
}) {
  const accion = useAction(otorgarPortal)
  const [clave, setClave] = useState('')
  const [estado, setEstado] = useState<Estado>(INICIAL)

  useEffect(() => {
    if (!abierto) {
      return
    }
    return () => {
      setClave('')
      setEstado(INICIAL)
    }
  }, [abierto])

  async function otorgar(escrita: string | null) {
    if (escrita !== null) {
      const motivo = motivoDeClave(escrita)
      if (motivo) {
        setEstado({ ...INICIAL, motivo })
        return
      }
    }
    setEstado(INICIAL)
    const envio = await enviarAccion(
      accion.executeAsync({ leadId, clave: escrita, otorgadoEnEsperado: version }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      const motivo = 'porCampo' in envio ? (envio.porCampo?.['clave'] ?? null) : null
      setEstado({ otorgado: null, error: motivo ? null : envio.error, motivo })
      return
    }
    const mostrada = envio.data.clave ?? escrita
    if (mostrada === null) {
      setEstado({
        ...INICIAL,
        error: {
          codigo: 'inesperado',
          mensaje: 'No recibimos la clave. Vuelve a otorgar el acceso.',
        },
      })
      return
    }
    setClave('')
    setEstado({
      ...INICIAL,
      otorgado: { ...envio.data, clave: mostrada, generada: envio.data.clave !== null },
    })
  }

  return {
    clave,
    escribir: (valor: string) => {
      setClave(valor)
      if (estado.motivo) {
        setEstado((e) => ({ ...e, motivo: null }))
      }
    },
    generar: () => otorgar(null),
    darConLaEscrita: () => otorgar(clave),
    enCurso: accion.isExecuting,
    ...estado,
    // Tras un conflicto: se vuelve a pedir con la versión nueva, lo escrito queda.
    olvidarError: () => {
      setEstado((e) => ({ ...e, error: null }))
    },
  }
}
