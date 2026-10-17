'use client'

import { useMemo, useState } from 'react'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import type { LoteDePapelera } from '../../../entities/papelera'
import {
  CLAVE_DE_LOTE,
  CLAVE_DE_VEHICULO_A_PURGAR,
  PANEL_PURGAR,
  motivoParaNoPurgar,
} from '../../../entities/purga-por-url'
import type { Objetivo } from './use-papelera'

// Qué se purga, en la URL de la papelera (`?panel=purgar&lote=<id>` y `&vehiculo=<id>`): se puede recargar, «atrás» lo cierra y un
// lote que ya no está en la página no abre (se avisa y la URL se limpia, escrita a mano también). El objetivo es estable entre
// renders (`useUltimo()` del diálogo lo pide así). Si se abrió en esta pantalla, vale lo que la persona tenía a la vista: un
// vehículo que sólo se ve tras «Mostrar los N» no está entre los primeros de la página que llega por props.
export function usePurgaPorUrl(lotes: readonly LoteDePapelera[]) {
  const url = usePanelPorUrl(PANEL_PURGAR, [CLAVE_DE_LOTE, CLAVE_DE_VEHICULO_A_PURGAR])
  const [abierto, setAbierto] = useState<Objetivo | null>(null)
  const loteId = url.valor(CLAVE_DE_LOTE)
  const vehiculoId = url.valor(CLAVE_DE_VEHICULO_A_PURGAR)
  const apertura = useApertura(url.abierto)
  const delAbierto =
    abierto && abierto.lote.id === loteId && (abierto.vehiculoId ?? null) === vehiculoId
      ? abierto
      : null
  const motivo = url.abierto && !delAbierto ? motivoParaNoPurgar(lotes, loteId, vehiculoId) : null
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${loteId ?? ''}:${vehiculoId ?? ''}` : null,
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
    return lote ? (vehiculoId ? { lote, vehiculoId } : { lote }) : null
  }, [url.abierto, rechazada, delAbierto, lote, vehiculoId])
  return {
    objetivo,
    abrir: (nuevo: Objetivo) => {
      setAbierto(nuevo)
      url.abrir({
        [CLAVE_DE_LOTE]: nuevo.lote.id,
        ...(nuevo.vehiculoId ? { [CLAVE_DE_VEHICULO_A_PURGAR]: nuevo.vehiculoId } : {}),
      })
    },
    cerrar: url.cerrar,
  }
}
