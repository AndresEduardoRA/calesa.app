'use client'

import { diferido } from '@/shared/ui/diferido'

// El modal de anotar o agendar desde una fila se pide recién al abrirse: el listado no carga los
// campos del seguimiento ni el editor para mostrar sus filas.
export const ModalDeAccionDeFilaDiferido = diferido(() =>
  import('./modal-de-accion-de-fila').then((modulo) => modulo.ModalDeAccionDeFila),
)
