'use client'

import { diferido } from '@/shared/ui/diferido'

// «Nuevo origen» y «Editar» se piden recién al abrirse: la lista no carga el código del formulario
// para mostrarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeOrigenDiferido = diferido(() =>
  import('./modal-de-origen').then((modulo) => modulo.ModalDeOrigen),
)
