'use client'

import { diferido } from '@/shared/ui/diferido'

// Los formularios de `/tarea` y `/evento` se piden recién al primer comando: el hilo no paga su código (ni el selector de personas) para dibujarse.
export const PanelDeTareaDiferido = diferido(() =>
  import('./panel-de-tarea').then((modulo) => modulo.PanelDeTarea),
)
export const PanelDeEventoDiferido = diferido(() =>
  import('./panel-de-evento').then((modulo) => modulo.PanelDeEvento),
)
