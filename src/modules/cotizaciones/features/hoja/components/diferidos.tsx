'use client'

import { diferido } from '@/shared/ui/diferido'

// «Avanzado» se pide recién al abrirse: la hoja no carga el modal para dibujarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeAvanzadoDiferido = diferido(() =>
  import('./modal-de-avanzado').then((modulo) => modulo.ModalDeAvanzado),
)
