'use client'

import { diferido } from '@/shared/ui/diferido'

// El formulario «Nuevo proyecto» se pide recién al abrirlo (`useAbiertoAlgunaVez`): `/repuestos` no carga su código para dibujar la lista.
export const DrawerDeNuevoProyectoDiferido = diferido(() =>
  import('./drawer-de-nuevo-proyecto').then((modulo) => modulo.DrawerDeNuevoProyecto),
)
