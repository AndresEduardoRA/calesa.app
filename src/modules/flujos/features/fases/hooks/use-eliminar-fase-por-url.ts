'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  CLAVE_DE_FASE_A_QUITAR,
  PANEL_ELIMINAR_FASE,
  motivoParaNoQuitarFase,
} from '../../../entities/fases/panel-de-fase'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'

// Abrir la confirmación de «Jubilar o eliminar» desde la fila (`?panel=eliminar-fase&quitar=<id>`).
export function useAbrirEliminarFase() {
  const url = usePanelPorUrl(PANEL_ELIMINAR_FASE, [CLAVE_DE_FASE_A_QUITAR])
  return (id: string) => {
    url.abrir({ [CLAVE_DE_FASE_A_QUITAR]: id })
  }
}

// La confirmación de «Jubilar o eliminar» una fase, en la URL: se puede recargar y «atrás» la cierra. Se monta una vez en la pantalla, no una por fila.
// Una fase que ya no está o que ya está jubilada no abre (se avisa y la URL se limpia, escrita a mano también); mientras se va, el diálogo conserva la
// última que vio.
export function useEliminarFasePorUrl(flujo: Pick<FlujoParaConfigurar, 'fases'>) {
  const url = usePanelPorUrl(PANEL_ELIMINAR_FASE, [CLAVE_DE_FASE_A_QUITAR])
  const id = url.valor(CLAVE_DE_FASE_A_QUITAR)
  const apertura = useApertura(url.abierto)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto ? motivoParaNoQuitarFase(flujo, id) : null,
    url.cerrar,
  )
  const vigente: FaseParaConfigurar | null =
    url.abierto && !rechazada ? (flujo.fases.find((f) => f.id === id) ?? null) : null
  const fase = useUltimo(vigente)
  return { abierto: vigente !== null, apertura, fase, cerrar: url.cerrar }
}
