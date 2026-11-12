'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { useRegional } from '@/shared/ui/regional'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioDeModal } from '@/shared/ui/use-envio-de-modal'
import {
  leerDecimal,
  paraEditar,
  validarTramo,
  type BorradorDeTramo,
} from '../../../entities/cotizador/configuracion'
import type { TramoConfigurado } from '../../../entities/cotizador/filas-de-configuracion'
import { guardarTramo } from '../actions/guardar-tramo'

type Args = {
  moneda: string
  original: TramoConfigurado | null
  abierto: boolean
  alCerrar: () => void
}
type Borrador = BorradorDeTramo & { activo: boolean }

const MENSAJE_DE_VALIDACION = 'Revisa los datos del tramo.'

// El formulario de un tramo de logística (8.12-2, C9): «Desde», «Hasta» (vacío = en adelante), «Logística» y «Activo». Lo tipeado se lee con el locale
// y viaja como texto canónico. Un tramo que se cruza con otro lo dice la base en «Desde» (23P01). La lista se renueva con el `revalidatePath` de la action.
export function useFormularioDeTramo({ moneda, original, abierto, alCerrar }: Args) {
  const { locale } = useRegional()
  const [inicial] = useState<Borrador>(() =>
    original
      ? {
          costoMin: paraEditar(original.costoMin, locale),
          costoMax: original.costoMax === null ? '' : paraEditar(original.costoMax, locale),
          monto: paraEditar(original.monto, locale),
          activo: original.activo,
        }
      : { costoMin: '', costoMax: '', monto: '', activo: true },
  )
  const [valores, setValores] = useState<Borrador>(inicial)
  const leer = () => validarTramo(valores, (texto, campo) => leerDecimal(texto, campo, locale))

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
      const { costoMin, costoMax, monto } = leido.datos
      return enviarAccion(
        guardarTramo({
          id: original?.id ?? null,
          moneda,
          costoMin,
          costoMax: costoMax ?? '',
          monto,
          activo: valores.activo,
        }),
        MENSAJE_DE_VALIDACION,
      )
    },
    alGuardar: () => {
      avisarExito(original ? 'Tramo guardado.' : 'Tramo agregado.')
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
