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
import { PANEL_RESTABLECER_EMBUDO, type AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { guardarPlantillaDelEmbudo } from '../actions/guardar-plantilla-del-embudo'

// «Restablecer» la plantilla del embudo (vuelven las de fábrica): pide confirmar, en la URL (`?panel=restablecer-embudo`); ya en las de
// fábrica no abre (escrita a mano, se avisa y se limpia). Lo que la base rechaza, también un conflicto, se dice dentro del diálogo.
export function useRestablecerPlantillaDelEmbudo(embudo: AjustesDeLeads['embudo']) {
  const router = useRouter()
  const [rechazo, setRechazo] = useState<ErrorApp | null>(null)
  const guardar = useAction(guardarPlantillaDelEmbudo)
  const url = usePanelPorUrl(PANEL_RESTABLECER_EMBUDO)
  const apertura = useApertura(url.abierto)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? String(apertura) : null,
    url.abierto && embudo.deFabrica ? 'La plantilla ya tiene las etapas de fábrica.' : null,
    url.cerrar,
  )

  async function confirmar() {
    setRechazo(null)
    const envio = await enviarAccion(
      guardar.executeAsync({ actualizadoEnEsperado: embudo.actualizadoEn, etapas: null }),
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
    avisarExito('La plantilla volvió a las etapas de fábrica.')
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
