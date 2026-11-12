'use client'

import { diferido } from '@/shared/ui/diferido'

// «Agregar» y «Editar» de un tramo o de una caja se piden recién al abrirse: la pestaña no carga el código del formulario para mostrarse. Se montan con
// `useAbiertoAlgunaVez()`.
export const ModalDeTramoDiferido = diferido(() =>
  import('./modal-de-tramo').then((modulo) => modulo.ModalDeTramo),
)

export const ModalDeCajaDiferido = diferido(() =>
  import('./modal-de-caja').then((modulo) => modulo.ModalDeCaja),
)
