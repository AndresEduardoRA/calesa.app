'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioDeModal } from '@/shared/ui/use-envio-de-modal'
import {
  borradorDeFechas,
  cambiosDeFechas,
  validarFechas,
  type BorradorDeFechas,
  type FechasDeSubasta,
} from '../../../entities/fechas-de-subasta'
import { guardarFechasDeSubasta } from '../actions/guardar-fechas-de-subasta'

type Args = {
  vehiculoId: string
  actualizadoEn: string
  fechas: FechasDeSubasta
  // La zona de quien edita: en ella escribe y en ella ve lo guardado.
  zona: string
  abierto: boolean
  alCerrar: () => void
}

const MENSAJE = 'Revisa las fechas de la subasta.'

// El formulario de las fechas de la subasta (A4b): el borrador en la zona de quien edita y su envío. Sin cambios, guardar es cerrar. Al
// guardar, la ficha se vuelve a leer (la fecha se ve en todos lados con su zona).
export function useFechasDeSubasta({
  vehiculoId,
  actualizadoEn,
  fechas,
  zona,
  abierto,
  alCerrar,
}: Args) {
  const router = useRouter()
  const inicial = borradorDeFechas(fechas, zona)
  const [valores, setValores] = useState<BorradorDeFechas>(inicial)
  const envio = useEnvioDeModal({
    abierto,
    hayCambios: valores.inicio !== inicial.inicio || valores.cierre !== inicial.cierre,
    validar: () => {
      const validadas = validarFechas(valores, zona)
      return validadas.ok ? null : validadas.errores
    },
    pedir: async () => {
      const validadas = validarFechas(valores, zona)
      if (!validadas.ok) return { ok: false, error: { codigo: 'validacion', mensaje: MENSAJE } }
      const cambios = cambiosDeFechas(fechas, validadas.datos)
      if (cambios === null) return { ok: true as const, data: { actualizadoEn } }
      return enviarAccion(
        guardarFechasDeSubasta({ vehiculoId, actualizadoEnEsperado: actualizadoEn, cambios }),
        MENSAJE,
      )
    },
    alGuardar: () => {
      avisarExito('Fechas de la subasta guardadas.')
      alCerrar()
      router.refresh()
    },
  })
  return {
    ...envio,
    valores,
    escribir: (cambios: Partial<BorradorDeFechas>) => {
      setValores((antes) => ({ ...antes, ...cambios }))
      for (const clave of Object.keys(cambios)) envio.quitarMotivo(clave)
    },
  }
}
