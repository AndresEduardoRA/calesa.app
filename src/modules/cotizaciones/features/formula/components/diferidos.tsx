'use client'

import { diferido } from '@/shared/ui/diferido'

// «Publicar el borrador» se pide recién al abrirse: la pestaña no carga el código del formulario para mostrarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDePublicarDiferido = diferido(() =>
  import('./modal-de-publicar').then((modulo) => modulo.ModalDePublicar),
)

// «Revertir a la versión N», igual.
export const ModalDeRevertirDiferido = diferido(() =>
  import('./modal-de-revertir').then((modulo) => modulo.ModalDeRevertir),
)
