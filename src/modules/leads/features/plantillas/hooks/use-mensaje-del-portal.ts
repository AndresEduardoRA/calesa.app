'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import { MENSAJE_DE_FABRICA, validarMensajeDelPortal } from '../../../entities/portal-mensaje'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { guardarMensajeDelPortal } from '../actions/guardar-mensaje-del-portal'

// El mensaje del portal en Configuración: el texto parte del guardado o, si no hay, del de fábrica con sus variables (se edita sobre lo
// de hoy). Las reglas se dicen junto al campo antes de enviar; lo que la base rechaza vuelve con su motivo, y un conflicto ofrece
// «Recargar». En blanco no se guarda: volver al de fábrica es «Restablecer», que confirma. Guardar el de fábrica tal cual lo deja nulo,
// así un cambio futuro del de fábrica le llega a la empresa. «Restablecer» es `useRestablecerMensajeDelPortal()`.
export function useMensajeDelPortal(portal: AjustesDeLeads['portal']) {
  const router = useRouter()
  const inicial = portal.mensaje ?? MENSAJE_DE_FABRICA
  const [texto, setTexto] = useState(inicial)
  const [motivo, setMotivo] = useState<string | null>(null)
  const [conflicto, setConflicto] = useState<string | null>(null)
  const guardar = useAction(guardarMensajeDelPortal)

  async function enviar() {
    const validado = validarMensajeDelPortal(texto)
    if (!validado.ok) {
      setMotivo(validado.motivo)
      return
    }
    if (validado.texto === null) {
      setMotivo('Para volver al texto de fábrica, usa «Restablecer».')
      return
    }
    const envio = await enviarAccion(
      guardar.executeAsync({
        actualizadoEnEsperado: portal.actualizadoEn,
        texto: validado.texto === MENSAJE_DE_FABRICA ? null : validado.texto,
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
    avisarExito('Mensaje del portal guardado.')
  }

  return {
    texto,
    escribir: (valor: string) => {
      setTexto(valor)
      setMotivo(null)
    },
    // Algo cambiado que todavía no se guardó: «Guardar» se apaga sin cambios.
    hayCambios: texto !== inicial,
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
