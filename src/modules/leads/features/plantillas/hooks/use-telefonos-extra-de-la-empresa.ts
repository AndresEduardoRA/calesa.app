'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { validarMaximoDeExtras, type AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { guardarTelefonosExtra } from '../actions/guardar-telefonos-extra'

// Los teléfonos extra en Configuración: el máximo (de 0 a 20, escrito como texto: la regla se dice junto al campo antes de enviar) y si
// cuentan como el principal. Lo que la base rechaza vuelve con su motivo; un conflicto ofrece «Recargar». «Guardar» se apaga sin cambios.
export function useTelefonosExtraDeLaEmpresa(telefonos: AjustesDeLeads['telefonos']) {
  const router = useRouter()
  const [maximo, setMaximo] = useState(String(telefonos.maximo))
  const [comoPrincipal, setComoPrincipal] = useState(telefonos.comoPrincipal)
  const [motivo, setMotivo] = useState<string | null>(null)
  const [conflicto, setConflicto] = useState<string | null>(null)
  const guardar = useAction(guardarTelefonosExtra)

  async function enviar() {
    const validado = validarMaximoDeExtras(maximo)
    if (!validado.ok) {
      setMotivo(validado.motivo)
      return
    }
    const envio = await enviarAccion(
      guardar.executeAsync({
        actualizadoEnEsperado: telefonos.actualizadoEn,
        maximo: validado.maximo,
        comoPrincipal,
      }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      if (envio.error.codigo === 'conflicto') {
        setConflicto(envio.error.mensaje)
      } else if (envio.error.codigo === 'regla' || envio.error.codigo === 'validacion') {
        setMotivo(envio.error.mensaje)
      } else {
        avisarError(envio.error)
      }
      return
    }
    router.refresh()
    avisarExito('Teléfonos extra guardados.')
  }

  return {
    maximo,
    comoPrincipal,
    escribirMaximo: (valor: string) => {
      setMaximo(valor)
      setMotivo(null)
    },
    cambiarRegla: setComoPrincipal,
    hayCambios:
      maximo.trim() !== String(telefonos.maximo) || comoPrincipal !== telefonos.comoPrincipal,
    motivo,
    conflicto,
    enCurso: guardar.isPending,
    enviar,
    // Trae la versión nueva: la `key` del formulario es la versión, así que vuelve a montarse con ella.
    recargar: () => {
      router.refresh()
    },
  }
}
