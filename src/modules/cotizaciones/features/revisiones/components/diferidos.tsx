'use client'

import { diferido } from '@/shared/ui/diferido'

// El panel de revisiones se pide la primera vez que se abre (`useAbiertoAlgunaVez()`): la página de una guardada no lo carga para dibujarse.
export const PanelDeRevisionesDiferido = diferido(() =>
  import('./panel-de-revisiones').then((modulo) => modulo.PanelDeRevisiones),
)
