'use client'

import { useMemo, useState } from 'react'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import {
  CLAVE_DE_LEAD_A_PURGAR,
  CLAVE_DE_LOTE,
  PANEL_PURGAR,
  motivoParaNoPurgar,
  type LoteDePapelera,
} from '../../../entities/papelera'
import type { Objetivo } from './use-papelera'

// Qué se purga, en la URL de la papelera (`?panel=purgar&lote=<id>` y `&lead=<id>`): se puede recargar, «atrás» lo cierra y un
// lote que ya no está en la página no abre (se avisa y la URL se limpia, escrita a mano también). El objetivo es estable entre
// renders (`useUltimo()` del diálogo lo pide así). Si se abrió en esta pantalla, vale lo que la persona tenía a la vista: un
// lead que sólo se ve tras «Mostrar los N» no está entre los primeros de la página que llega por props.
export function usePurgaPorUrl(lotes: readonly LoteDePapelera[]) {
  const url = usePanelPorUrl(PANEL_PURGAR, [CLAVE_DE_LOTE, CLAVE_DE_LEAD_A_PURGAR])
  const [abierto, setAbierto] = useState<Objetivo | null>(null)
  const loteId = url.valor(CLAVE_DE_LOTE)
  const leadId = url.valor(CLAVE_DE_LEAD_A_PURGAR)
  const apertura = useApertura(url.abierto)
  const delAbierto =
    abierto && abierto.lote.id === loteId && (abierto.leadId ?? null) === leadId ? abierto : null
  const motivo = url.abierto && !delAbierto ? motivoParaNoPurgar(lotes, loteId, leadId) : null
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${loteId ?? ''}:${leadId ?? ''}` : null,
    motivo,
    url.cerrar,
  )
  const lote = lotes.find((l) => l.id === loteId)
  const objetivo = useMemo<Objetivo | null>(() => {
    if (!url.abierto || rechazada) {
      return null
    }
    if (delAbierto) {
      return delAbierto
    }
    return lote ? (leadId ? { lote, leadId } : { lote }) : null
  }, [url.abierto, rechazada, delAbierto, lote, leadId])
  return {
    objetivo,
    abrir: (nuevo: Objetivo) => {
      setAbierto(nuevo)
      url.abrir({
        [CLAVE_DE_LOTE]: nuevo.lote.id,
        ...(nuevo.leadId ? { [CLAVE_DE_LEAD_A_PURGAR]: nuevo.leadId } : {}),
      })
    },
    cerrar: url.cerrar,
  }
}
