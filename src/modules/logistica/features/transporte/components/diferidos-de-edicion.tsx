'use client'

import { diferido } from '@/shared/ui/diferido'

// El formulario de «Editar grupo» se pide recién al abrirlo: la lista de embarques no carga su código para dibujarse.
export const DrawerDeEdicionDelGrupoDiferido = diferido(() =>
  import('./drawer-de-edicion-del-grupo').then((modulo) => modulo.DrawerDeEdicionDelGrupo),
)
