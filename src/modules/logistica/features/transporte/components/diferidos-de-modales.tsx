'use client'

import { diferido } from '@/shared/ui/diferido'

// «Nuevo puerto», «Nueva naviera» y «Editar» se piden recién al abrirse: la lista no carga el código del formulario para mostrarse. Se montan con `useAbiertoAlgunaVez()`.
export const ModalDePuertoDiferido = diferido(() =>
  import('./modal-de-puerto').then((modulo) => modulo.ModalDePuerto),
)

export const ModalDeNavieraDiferido = diferido(() =>
  import('./modal-de-naviera').then((modulo) => modulo.ModalDeNaviera),
)
