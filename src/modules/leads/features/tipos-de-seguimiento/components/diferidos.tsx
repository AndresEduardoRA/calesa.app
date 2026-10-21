'use client'

import { diferido } from '@/shared/ui/diferido'

// «Nuevo tipo» y «Editar» se piden recién al abrirse: la lista no carga el código del formulario (ni el selector de iconos) para
// mostrarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeTipoDeSeguimientoDiferido = diferido(() =>
  import('./modal-de-tipo-de-seguimiento').then((modulo) => modulo.ModalDeTipoDeSeguimiento),
)

// La confirmación de eliminar un tipo se pide al abrirse (`useAbiertoAlgunaVez()`).
export const EliminarTipoDeSeguimientoDiferido = diferido(() =>
  import('./eliminar-tipo-de-seguimiento').then((modulo) => modulo.EliminarTipoDeSeguimiento),
)
