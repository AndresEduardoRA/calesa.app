'use client'

import dynamic from 'next/dynamic'

// Los paneles de «Quién lo tiene» se piden recién al abrirse: la ficha no carga su código para
// mostrar la lista. Se montan con `useAbiertoAlgunaVez()`.
export const PanelDeCarteraDiferido = dynamic(
  () => import('./panel-de-cartera').then((modulo) => modulo.PanelDeCartera),
  { ssr: false },
)

export const DialogoDeSalirDiferido = dynamic(
  () => import('./dialogo-de-salir').then((modulo) => modulo.DialogoDeSalir),
  { ssr: false },
)
