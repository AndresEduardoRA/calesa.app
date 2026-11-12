'use client'

import { diferido } from '@/shared/ui/diferido'

// El hueco «Aduana» se pide recién al abrir su bloque (`BloqueDelHueco` no lo monta antes): el panel de la unidad no carga su código para dibujarse. Un hueco recibe sólo `{ unidad }`.
export const HuecoDeAduanaDiferido = diferido(() =>
  import('./hueco-de-aduana').then((modulo) => modulo.HuecoDeAduana),
)
