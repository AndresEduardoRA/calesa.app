'use client'

import { diferido } from '@/shared/ui/diferido'

// «Nuevo nivel» y «Renombrar» se piden recién al abrirse: la lista no carga el código del formulario para mostrarse. Se monta con
// `useAbiertoAlgunaVez()`.
export const ModalDeNivelDiferido = diferido(() =>
  import('./modal-de-nivel').then((modulo) => modulo.ModalDeNivel),
)

// La confirmación de eliminar un nivel se pide al abrirse (`useAbiertoAlgunaVez()`).
export const EliminarNivelDiferido = diferido(() =>
  import('./eliminar-nivel').then((modulo) => modulo.EliminarNivel),
)
