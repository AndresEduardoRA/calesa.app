'use client'

import { diferido } from '@/shared/ui/diferido'

// El modal de «Mover a …» una etapa perdida se pide recién al abrirse (`useAbiertoAlgunaVez()`): ni el kanban ni la
// ficha cargan su código para dibujar las tarjetas.
export const ModalDeMovidaDiferido = diferido(() =>
  import('./modal-de-movida').then((modulo) => modulo.ModalDeMovida),
)
