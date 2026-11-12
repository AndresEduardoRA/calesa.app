'use client'

import { useRouter } from 'next/navigation'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisarExito } from '@/shared/ui/toasts'
import {
  textoDelCanal,
  type CanalDeAforo,
  type DeclaracionLeida,
} from '../../../entities/aduana/declaracion'
import { avisarCambioDeLaUnidad } from '../../nucleo/hooks/eventos-de-la-unidad'
import { asignarCanal } from '../actions/asignar-canal'

const MENSAJE_DE_VALIDACION = 'Elige un canal de aforo.'
const SIN_RED = 'No pudimos llegar al servidor. No se asignó el canal: vuelve a intentar.'

// Asignar o cambiar el canal con la versión que se leyó (6.09-2). Devuelve el motivo si la base no lo dejó (el diálogo sigue abierto y lo dice); si salió, avisa a los huecos de las unidades
// de la declaración (el hueco «Aduana» muestra el canal) y vuelve a pedir la página al servidor.
export function useAsignarElCanal(declaracion: DeclaracionLeida) {
  const router = useRouter()
  return async function asignar(canal: CanalDeAforo): Promise<ErrorApp | null> {
    const envio = await enviarAccion(
      asignarCanal({
        declaracionId: declaracion.id,
        actualizadoEnEsperado: declaracion.actualizadoEn,
        canal,
      }),
      MENSAJE_DE_VALIDACION,
    )
    if (envio.ok) {
      for (const vehiculo of declaracion.vehiculos) {
        avisarCambioDeLaUnidad(vehiculo.vehiculoId)
      }
      avisarExito(`Canal «${textoDelCanal(canal)}» asignado a «${declaracion.numero}».`)
      router.refresh()
      return null
    }
    return 'sinRed' in envio ? { codigo: 'inesperado', mensaje: SIN_RED } : envio.error
  }
}
