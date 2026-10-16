'use client'

import { useSyncExternalStore } from 'react'
import type { ResultadoDeDeshacer } from '../../../entities/importacion/deshacer'

// Lo que contestó la base al deshacer cada importación, en esta pestaña. Una misma importación tiene
// dos «Deshacer» en `/leads/importar` (el del resultado y el de «Tus importaciones recientes»): el que
// no se pulsó tiene que enterarse, o sigue ofreciendo deshacer lo que ya se deshizo (9d-3).
const deshechas = new Map<string, ResultadoDeDeshacer>()
const oyentes = new Set<() => void>()

export function anotarDeshecha(importacionId: string, resultado: ResultadoDeDeshacer): void {
  deshechas.set(importacionId, resultado)
  for (const oyente of oyentes) {
    oyente()
  }
}

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

export function useDeshecha(importacionId: string): ResultadoDeDeshacer | null {
  return useSyncExternalStore(
    suscribir,
    () => deshechas.get(importacionId) ?? null,
    () => null,
  )
}
