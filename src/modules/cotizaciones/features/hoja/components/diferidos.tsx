'use client'

import { diferido } from '@/shared/ui/diferido'

// «Avanzado» se pide recién al abrirse: la hoja no carga el modal para dibujarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeAvanzadoDiferido = diferido(() =>
  import('./modal-de-avanzado').then((modulo) => modulo.ModalDeAvanzado),
)

// La ayuda de una celda se pide la primera vez que se abre (`useAbiertoAlgunaVez()`).
export const AyudaDeCeldaDiferida = diferido(() =>
  import('./ayuda-de-celda').then((modulo) => modulo.AyudaDeCelda),
)
