'use client'

import { diferido } from '@/shared/ui/diferido'

// El camino a lo antiguo se pide recién al llegar al tope: el hilo no paga su código para dibujarse.
export const IrAUnaFechaDiferido = diferido(() =>
  import('@/shared/ui/ir-a-una-fecha').then((modulo) => modulo.IrAUnaFecha),
)
export const DesdeUnaFechaDiferido = diferido(() =>
  import('@/shared/ui/desde-una-fecha').then((modulo) => modulo.DesdeUnaFecha),
)
