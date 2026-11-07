'use client'

import { useMemo, useState } from 'react'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import type { LoteDeCotizaciones } from '../../../entities/papelera/lotes'
import {
  CLAVE_DE_COTIZACION_A_PURGAR,
  CLAVE_DE_LOTE,
  PANEL_PURGAR,
  motivoParaNoPurgar,
} from '../../../entities/papelera/url'
import type { Objetivo } from './use-papelera'

// Qué se purga, en la URL de la papelera (`?panel=purgar&lote=<id>` y `&cotizacion=<id>`): se puede recargar, «atrás» lo cierra, y una URL que no abre (sin la
// clave, un lote que ya no está en la página, una cotización de otro lote) avisa y se limpia, escrita a mano también. El objetivo es estable entre renders
// (`useUltimo()` del diálogo lo pide así). Si se abrió en esta pantalla, vale lo que la persona tenía a la vista: una cotización que sólo se ve tras «Mostrar
// los N» no está entre las primeras de la página que llega por props.
export function usePurgaPorUrl(lotes: readonly LoteDeCotizaciones[], puedePurgar: boolean) {
  const url = usePanelPorUrl(PANEL_PURGAR, [CLAVE_DE_LOTE, CLAVE_DE_COTIZACION_A_PURGAR])
  const [abierto, setAbierto] = useState<Objetivo | null>(null)
  const loteId = url.valor(CLAVE_DE_LOTE)
  const cotizacionId = url.valor(CLAVE_DE_COTIZACION_A_PURGAR)
  const apertura = useApertura(url.abierto)
  const delAbierto =
    puedePurgar &&
    abierto &&
    abierto.lote.id === loteId &&
    (abierto.cotizacionId ?? null) === cotizacionId
      ? abierto
      : null
  const motivo =
    url.abierto && !delAbierto ? motivoParaNoPurgar(lotes, loteId, cotizacionId, puedePurgar) : null
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${loteId ?? ''}:${cotizacionId ?? ''}` : null,
    motivo,
    url.cerrar,
  )
  const lote = lotes.find((l) => l.id === loteId)
  const objetivo = useMemo<Objetivo | null>(() => {
    if (!url.abierto || rechazada || !puedePurgar) {
      return null
    }
    if (delAbierto) {
      return delAbierto
    }
    return lote ? (cotizacionId ? { lote, cotizacionId } : { lote }) : null
  }, [url.abierto, rechazada, puedePurgar, delAbierto, lote, cotizacionId])
  return {
    objetivo,
    abrir: (nuevo: Objetivo) => {
      setAbierto(nuevo)
      url.abrir({
        [CLAVE_DE_LOTE]: nuevo.lote.id,
        ...(nuevo.cotizacionId ? { [CLAVE_DE_COTIZACION_A_PURGAR]: nuevo.cotizacionId } : {}),
      })
    },
    cerrar: url.cerrar,
  }
}
