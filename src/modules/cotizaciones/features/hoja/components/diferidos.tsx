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

// La ayuda de una tabla, aparte de la de texto: su panel se pide la primera vez que la URL nombra una celda con tabla.
export const AyudaDeTablaDiferida = diferido(() =>
  import('./ayuda-de-tabla').then((modulo) => modulo.AyudaDeTabla),
)
