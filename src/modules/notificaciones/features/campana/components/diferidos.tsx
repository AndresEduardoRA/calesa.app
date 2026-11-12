'use client'

import { diferido } from '@/shared/ui/diferido'

// El contenido del popover de la campana se pide al abrirla: el marco de toda pantalla no carga su código.
export const ContenidoDeLaCampanaDiferido = diferido(() =>
  import('./contenido-de-la-campana').then((modulo) => modulo.ContenidoDeLaCampana),
)

// El contador y Realtime se piden al hidratar el marco, no viajan en el JS en frío de la pantalla.
export const SuscripcionDeLaCampanaDiferida = diferido(() =>
  import('./suscripcion-de-la-campana').then((modulo) => modulo.SuscripcionDeLaCampana),
)
