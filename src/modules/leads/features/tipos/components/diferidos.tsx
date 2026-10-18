'use client'

import { diferido } from '@/shared/ui/diferido'

// «Nuevo tipo» y «Editar» se piden recién al abrirse: la lista no carga el código del formulario
// para mostrarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeTipoDiferido = diferido(() =>
  import('./modal-de-tipo').then((modulo) => modulo.ModalDeTipo),
)

// La confirmación de eliminar un tipo se pide al abrirse (`useAbiertoAlgunaVez()`).
export const EliminarTipoDiferido = diferido(() =>
  import('./eliminar-tipo').then((modulo) => modulo.EliminarTipo),
)
