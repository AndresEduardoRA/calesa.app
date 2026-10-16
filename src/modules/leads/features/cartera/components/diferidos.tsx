'use client'

import { diferido } from '@/shared/ui/diferido'

// Los paneles de «Quién lo tiene» se piden recién al abrirse: la ficha no carga su código para
// mostrar la lista. Se montan con `useAbiertoAlgunaVez()`.
export const PanelDeCarteraDiferido = diferido(() =>
  import('./panel-de-cartera').then((modulo) => modulo.PanelDeCartera),
)

export const DialogoDeSalirDiferido = diferido(() =>
  import('./dialogo-de-salir').then((modulo) => modulo.DialogoDeSalir),
)
