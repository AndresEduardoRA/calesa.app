'use client'

import { diferido } from '@/shared/ui/diferido'

// El panel de vincular se pide recién al abrirse: Inicio no carga su código para dibujar los turnos. Se monta con `useAbiertoAlgunaVez()`.
export const PanelParaVincularDiferido = diferido(() =>
  import('./panel-para-vincular').then((modulo) => modulo.PanelParaVincular),
)
