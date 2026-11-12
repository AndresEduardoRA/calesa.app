'use client'

import { diferido } from '@/shared/ui/diferido'

// «Agregar» y «Editar» de un valor se piden recién al abrirse: la lista no carga el código del formulario para mostrarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeValorDiferido = diferido(() =>
  import('./modal-de-valor').then((modulo) => modulo.ModalDeValor),
)

// La confirmación de eliminar un valor se pide al abrirse (`useAbiertoAlgunaVez()`).
export const EliminarValorDiferido = diferido(() =>
  import('./eliminar-valor').then((modulo) => modulo.EliminarValor),
)
