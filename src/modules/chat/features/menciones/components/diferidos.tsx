'use client'

import { diferido } from '@/shared/ui/diferido'

// El drawer de una mención se pide recién al abrirla: el hilo no paga su código para dibujarse.
export const DrawerDeMencionDiferido = diferido(() =>
  import('./drawer-de-mencion').then((modulo) => modulo.DrawerDeMencion),
)

// El selector del `#` se pide con el primer `#`: el chat no paga el buscador ni las lecturas hasta entonces.
export const SelectorDeMencionesDiferido = diferido(() =>
  import('./selector-de-menciones').then((modulo) => modulo.SelectorDeMenciones),
)
