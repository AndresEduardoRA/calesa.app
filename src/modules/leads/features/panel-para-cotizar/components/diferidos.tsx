'use client'

import { diferido } from '@/shared/ui/diferido'

// El panel del cliente se pide recién al abrirse: la hoja de cotizar no carga su código para dibujar la barra. Se monta con `useAbiertoAlgunaVez()`.
export const PanelDelClienteDiferido = diferido(() =>
  import('./panel-del-cliente').then((modulo) => modulo.PanelDelCliente),
)
