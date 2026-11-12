'use client'

import { diferido } from '@/shared/ui/diferido'

// «Nueva categoría» y «Editar» se piden recién al abrirse: la lista no carga el código del formulario para mostrarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeCategoriaDiferido = diferido(() =>
  import('./modal-de-categoria').then((modulo) => modulo.ModalDeCategoria),
)

// La confirmación de eliminar una categoría se pide al abrirse (`useAbiertoAlgunaVez()`).
export const EliminarCategoriaDiferido = diferido(() =>
  import('./eliminar-categoria').then((modulo) => modulo.EliminarCategoria),
)
