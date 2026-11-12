'use client'

import { diferido } from '@/shared/ui/diferido'

// El cuerpo de la lista de atajos se pide la primera vez que se abre: el shell la monta en todas las pantallas.
export const ListaDeAtajosDiferida = diferido<{
  abierta: boolean
  alCambiar: (abierta: boolean) => void
}>(() => import('./lista-de-atajos').then((m) => m.ListaDeAtajos))
