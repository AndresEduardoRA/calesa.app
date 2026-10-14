'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { avisar, avisarError, avisarExito } from '@/shared/ui/toasts'
import { consultarFicha } from '../../../composicion.client'
import { pideRevisarIntegracion } from '../../../entities/apibara'
import { respuestaDe } from '../../fotos/envio'
import { refrescarSubasta } from '../actions/refrescar-subasta'
import { RUTA_DE_INTEGRACIONES } from '../ruta'

type Args = {
  vehiculoId: string
  origenId: string
  // Con qué se vuelve a preguntar (enlace, lote o VIN).
  entrada: string
  // La versión del vehículo que tenía en pantalla quien refresca.
  actualizadoEn: string
  // Quien puede ir a Integraciones si la clave o la cuota frenan.
  puedeConfigurar: boolean
}

function resumenDelRefresco(actualizados: number, conservados: readonly string[]): string {
  const base =
    actualizados > 0 ? 'Subasta actualizada.' : 'Subasta consultada: no había datos nuevos.'
  return conservados.length > 0
    ? `${base} Se conservó lo que editaste: ${conservados.join(', ')}.`
    : base
}

// Refrescar la subasta de un vehículo: pregunta a apibara y, con lo que trae, la action decide qué
// se actualiza y qué se conserva. Un fallo de apibara se dice con su motivo y, si lo frena la
// clave o la cuota, ofrece ir a Integraciones a quien puede.
export function useRefrescoDeSubasta({
  vehiculoId,
  origenId,
  entrada,
  actualizadoEn,
  puedeConfigurar,
}: Args) {
  const router = useRouter()
  const { executeAsync } = useAction(refrescarSubasta)
  const [enCurso, setEnCurso] = useState(false)

  async function refrescar(): Promise<void> {
    if (enCurso) {
      return
    }
    setEnCurso(true)
    try {
      const ficha = await consultarFicha(origenId, entrada)
      if (!ficha.ok) {
        const { codigo, mensaje } = ficha.error
        if (puedeConfigurar && pideRevisarIntegracion(codigo)) {
          avisar(mensaje, {
            etiqueta: 'Ir a Integraciones',
            alHacer: () => {
              router.push(RUTA_DE_INTEGRACIONES as Route)
            },
          })
        } else {
          avisarError({ codigo: 'inesperado', mensaje })
        }
        return
      }
      const escrito = await respuestaDe(
        executeAsync({
          vehiculoId,
          actualizadoEnEsperado: actualizadoEn,
          ficha: ficha.data.data,
        }),
      )
      if (escrito.ok) {
        avisarExito(resumenDelRefresco(escrito.data.actualizados, escrito.data.conservados))
      } else {
        avisarError(escrito.error)
      }
    } finally {
      setEnCurso(false)
    }
  }

  return { refrescar, enCurso }
}
