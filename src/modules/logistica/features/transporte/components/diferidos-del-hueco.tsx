'use client'

import { diferido } from '@/shared/ui/diferido'

// El hueco «Transporte» se pide recién al abrir su bloque (`BloqueDelHueco` no lo monta antes): el panel de la unidad no carga su código para dibujarse. Un hueco recibe sólo `{ unidad }`.
export const HuecoDeTransporteDiferido = diferido(() =>
  import('./hueco-de-transporte').then((modulo) => modulo.HuecoDeTransporte),
)
