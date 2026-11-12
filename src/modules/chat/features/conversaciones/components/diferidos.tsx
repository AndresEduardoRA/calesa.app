'use client'

import { diferido } from '@/shared/ui/diferido'

// Los paneles de la lista se piden recién al abrirse: la lista no paga su código (ni el del buscador de personas) para dibujarse.
export const ModalDeDirectaDiferido = diferido(() =>
  import('./modal-de-directa').then((modulo) => modulo.ModalDeDirecta),
)
export const ModalDeGrupoDiferido = diferido(() =>
  import('./modal-de-grupo').then((modulo) => modulo.ModalDeGrupo),
)
export const ConfirmarSalirDiferido = diferido(() =>
  import('./confirmar-salir').then((modulo) => modulo.ConfirmarSalir),
)
