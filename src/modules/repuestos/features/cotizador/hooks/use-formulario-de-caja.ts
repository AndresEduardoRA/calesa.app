'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { useRegional } from '@/shared/ui/regional'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioDeModal } from '@/shared/ui/use-envio-de-modal'
import { leerDecimal, paraEditar, validarCaja } from '../../../entities/cotizador/configuracion'
import type { CajaConfigurada } from '../../../entities/cotizador/filas-de-configuracion'
import { guardarCaja } from '../actions/guardar-caja'

type Args = {
  moneda: string
  original: CajaConfigurada | null
  abierto: boolean
  alCerrar: () => void
}
type Borrador = { monto: string; activa: boolean }

const MENSAJE_DE_VALIDACION = 'Revisa los datos de la caja.'

// El formulario de una caja (8.12-2, C9): «Monto» y «Activa». Una caja repetida de la misma moneda la dice la base en «Monto» (23505).
export function useFormularioDeCaja({ moneda, original, abierto, alCerrar }: Args) {
  const { locale } = useRegional()
  const [inicial] = useState<Borrador>(() =>
    original
      ? { monto: paraEditar(original.monto, locale), activa: original.activa }
      : { monto: '', activa: true },
  )
  const [valores, setValores] = useState<Borrador>(inicial)
  const leer = () => validarCaja(valores, (texto, campo) => leerDecimal(texto, campo, locale))

  const envio = useEnvioDeModal({
    abierto,
    hayCambios: JSON.stringify(valores) !== JSON.stringify(inicial),
    validar: () => {
      const leido = leer()
      return leido.ok ? null : (leido.errores as Record<string, string>)
    },
    pedir: async () => {
      const leido = leer()
      if (!leido.ok) {
        return { ok: false, error: { codigo: 'validacion', mensaje: MENSAJE_DE_VALIDACION } }
      }
      return enviarAccion(
        guardarCaja({
          id: original?.id ?? null,
          moneda,
          monto: leido.datos.monto,
          activa: valores.activa,
        }),
        MENSAJE_DE_VALIDACION,
      )
    },
    alGuardar: () => {
      avisarExito(original ? 'Caja guardada.' : 'Caja agregada.')
      alCerrar()
    },
  })

  return {
    ...envio,
    valores,
    escribir: (cambios: Partial<Borrador>) => {
      setValores((antes) => ({ ...antes, ...cambios }))
      for (const clave of Object.keys(cambios)) envio.quitarMotivo(clave)
    },
  }
}
