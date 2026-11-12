'use client'

import { diferido } from '@/shared/ui/diferido'

// «Nueva fase» se pide recién al abrirse: la lista no carga el código del formulario para mostrarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeNuevaFaseDiferido = diferido(() =>
  import('./modal-de-nueva-fase').then((modulo) => modulo.ModalDeNuevaFase),
)

// La confirmación de jubilar o eliminar se pide al abrirse (`useAbiertoAlgunaVez()`).
export const ConfirmarEliminarFaseDiferido = diferido(() =>
  import('./confirmar-eliminar-fase').then((modulo) => modulo.ConfirmarEliminarFase),
)
