'use client'

import { diferido } from '@/shared/ui/diferido'

// «Agregar teléfono» se pide recién al abrirse: «Datos» no carga su código para mostrar la lista. Se
// monta con `useAbiertoAlgunaVez()`.
export const ModalDeExtraDiferido = diferido(() =>
  import('./modal-de-extra').then((modulo) => modulo.ModalDeExtra),
)
