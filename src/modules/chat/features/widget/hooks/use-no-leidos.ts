'use client'

import { useSyncExternalStore } from 'react'
import { noLeidosStore } from '../no-leidos-store'

// El contador de no leídos de esta pestaña (0 hasta que la suscripción lea).
export function useNoLeidos(): number {
  return useSyncExternalStore(noLeidosStore.suscribir, noLeidosStore.leer, () => 0)
}
