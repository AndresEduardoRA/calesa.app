'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import {
  cambiosDeOportunidad,
  datosDeOportunidad,
  validarOportunidad,
  valoresDeOportunidad,
  type Oportunidad,
  type ValoresDeOportunidad,
} from '../../../entities/oportunidad'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { crearOportunidad } from '../actions/crear-oportunidad'
import { guardarOportunidad } from '../actions/guardar-oportunidad'

// Los campos que pueden traer un motivo (el `hint` de la base es la clave del formulario).
const CAMPOS = ['titulo', 'monto_estimado', 'notas', 'vehiculo', 'embudo'] as const
type CampoConError = (typeof CAMPOS)[number]
export type ErroresDelFormulario = Partial<Record<CampoConError, string>>

function erroresDesde(porCampo: Record<string, string>): ErroresDelFormulario {
  return Object.fromEntries(
    CAMPOS.flatMap((campo) => (porCampo[campo] ? [[campo, porCampo[campo]]] : [])),
  )
}

type Opciones = {
  leadId: string
  // Al editar, la que se edita; al crear, null.
  oportunidad: Oportunidad | null
  alTerminar: () => void
}

// El formulario de una oportunidad: crear (con el id del intento, que vive mientras el panel está
// abierto, así un reintento no crea dos) o editar (sólo lo que cambió, con la versión). Lo tipeado no se
// pierde: un rechazo deja los valores y dice el motivo junto a su campo; un conflicto ofrece «Recargar».
export function useFormularioDeOportunidad({ leadId, oportunidad, alTerminar }: Opciones) {
  const router = useRouter()
  const [intento] = useState(() => crypto.randomUUID())
  const [valores, setValores] = useState<ValoresDeOportunidad>(valoresDeOportunidad(oportunidad))
  const [embudo, setEmbudo] = useState('')
  const [errores, setErrores] = useState<ErroresDelFormulario>({})
  const [conflicto, setConflicto] = useState<string | null>(null)
  const crear = useAction(crearOportunidad)
  const guardar = useAction(guardarOportunidad)

  function rechazo(error: ErrorApp, porCampo?: Record<string, string>) {
    if (error.codigo === 'conflicto') {
      setConflicto(error.mensaje)
    } else if (porCampo) {
      setErrores(erroresDesde(porCampo))
    } else {
      avisarError(error)
    }
  }

  async function enviar() {
    const locales = validarOportunidad(valores)
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }
    const envio = oportunidad
      ? await enviarAccion(
          guardar.executeAsync({
            id: oportunidad.id,
            actualizadoEnEsperado: oportunidad.actualizadoEn,
            cambios: cambiosDeOportunidad(oportunidad, valores),
          }),
          MENSAJE_DE_VALIDACION,
        )
      : await enviarAccion(
          crear.executeAsync({
            id: intento,
            leadId,
            datos: { ...datosDeOportunidad(valores), ...(embudo ? { embudo_id: embudo } : {}) },
          }),
          MENSAJE_DE_VALIDACION,
        )
    if (!envio.ok) {
      rechazo(envio.error, 'porCampo' in envio ? envio.porCampo : undefined)
      return
    }
    avisarExito(oportunidad ? 'Oportunidad guardada.' : 'Oportunidad creada.')
    router.refresh()
    alTerminar()
  }

  return {
    valores,
    cambiar: (campo: keyof ValoresDeOportunidad, valor: string) => {
      setValores((v) => ({ ...v, [campo]: valor }))
      const conError: CampoConError = campo === 'monto' ? 'monto_estimado' : campo
      setErrores((e) => ({ ...e, [conError]: undefined }))
    },
    embudo,
    setEmbudo,
    // Al editar sin cambios no hay nada que mandar.
    sinCambios:
      oportunidad !== null && Object.keys(cambiosDeOportunidad(oportunidad, valores)).length === 0,
    errores,
    conflicto,
    enCurso: crear.isPending || guardar.isPending,
    enviar,
    recargar: () => {
      window.location.reload()
    },
  }
}
