'use client'

import { diferido } from '@/shared/ui/diferido'

// Los paneles de la agenda se piden recién al abrirse: el calendario no paga su código (ni el del selector de personas) para dibujar los chips.
export const PanelDeEventoDiferido = diferido(() =>
  import('../../eventos/components/panel-de-evento').then((modulo) => modulo.PanelDeEvento),
)
export const PanelDeFormularioDeEventoDiferido = diferido(() =>
  import('../../eventos/components/panel-de-formulario-de-evento').then(
    (modulo) => modulo.PanelDeFormularioDeEvento,
  ),
)
export const PanelDeTareaDiferido = diferido(() =>
  import('../../tareas/components/panel-de-tarea').then((modulo) => modulo.PanelDeTarea),
)
export const PanelDeFormularioDeTareaDiferido = diferido(() =>
  import('../../tareas/components/panel-de-formulario-de-tarea').then(
    (modulo) => modulo.PanelDeFormularioDeTarea,
  ),
)
