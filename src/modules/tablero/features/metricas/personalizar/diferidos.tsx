'use client'

import { diferido } from '@/shared/ui/diferido'

// El panel de «Personalizar» se pide recién al abrirse: el tablero no carga su código para dibujar los widgets.
// Se monta con `useAbiertoAlgunaVez()`.
export const PanelDePersonalizarDiferido = diferido(() =>
  import('./panel-de-personalizar').then((modulo) => modulo.PanelDePersonalizar),
)
