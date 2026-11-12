'use client'

import { diferido } from '@/shared/ui/diferido'

// El hueco «Aduana» se pide recién al abrir su bloque (`BloqueDelHueco` no lo monta antes): el panel de la unidad no carga su código para dibujarse. Un hueco recibe sólo `{ unidad }`.
export const HuecoDeAduanaDiferido = diferido(() =>
  import('./hueco-de-aduana').then((modulo) => modulo.HuecoDeAduana),
)

// El buscador de vehículos de la composición (6.09-2) y el formulario de la declaración se piden al usarse: el resumen y la lista no cargan su código.
export const BuscadorDeUnidadesDiferido = diferido(() =>
  import('./buscador-de-unidades').then((modulo) => modulo.BuscadorDeUnidades),
)

export const DrawerDeDeclaracionDiferido = diferido(
  () => import('./drawer-de-declaracion').then((modulo) => modulo.DrawerDeDeclaracion),
  { aviso: 'pantalla' },
)

export const ConfirmarAsignarCanalDiferido = diferido(
  () => import('./confirmar-asignar-canal').then((modulo) => modulo.ConfirmarAsignarCanal),
  { aviso: 'pantalla' },
)
