'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { PANEL_RESTABLECER_PORTAL, type AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { guardarMensajeDelPortal } from '../actions/guardar-mensaje-del-portal'

// «Restablecer» el mensaje del portal (vuelve el de fábrica): pide confirmar, en la URL (`?panel=restablecer-portal`); ya en el de
// fábrica no abre (escrita a mano, se avisa y se limpia). Lo que la base rechaza, también un conflicto, se dice dentro del diálogo.
export function useRestablecerMensajeDelPortal(portal: AjustesDeLeads['portal']) {
  const router = useRouter()
  const [rechazo, setRechazo] = useState<ErrorApp | null>(null)
  const guardar = useAction(guardarMensajeDelPortal)
  const url = usePanelPorUrl(PANEL_RESTABLECER_PORTAL)
  const apertura = useApertura(url.abierto)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? String(apertura) : null,
    url.abierto && portal.mensaje === null ? 'El mensaje ya es el de fábrica.' : null,
    url.cerrar,
  )

  async function confirmar() {
    setRechazo(null)
    const envio = await enviarAccion(
      guardar.executeAsync({ actualizadoEnEsperado: portal.actualizadoEn, texto: null }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      if (['conflicto', 'regla', 'validacion'].includes(envio.error.codigo)) {
        setRechazo(envio.error)
      } else {
        avisarError(envio.error)
      }
      return
    }
    url.cerrar()
    router.refresh()
    avisarExito('El mensaje volvió al de fábrica.')
  }

  return {
    abierto: url.abierto && !rechazada,
    abrir: () => {
      setRechazo(null)
      url.abrir()
    },
    cerrar: url.cerrar,
    confirmar,
    enCurso: guardar.isPending,
    rechazo,
    // Tras un conflicto: trae la versión nueva (la `key` vuelve a montar la pestaña) y cierra.
    recargar: () => {
      url.cerrar()
      router.refresh()
    },
  }
}
