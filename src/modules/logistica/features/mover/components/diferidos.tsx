'use client'

import { diferido } from '@/shared/ui/diferido'

// El hueco «Qué falta» se pide al hidratar el panel (nace abierto), no al dibujar la página: el panel de la unidad no carga su código hasta que se abre. Un hueco recibe sólo `{ unidad }`.
export const HuecoQueFaltaDiferido = diferido(() =>
  import('./hueco-que-falta').then((modulo) => modulo.HuecoQueFalta),
)

// «Notas» e «Historial» nacen plegados: su código se pide al abrir el bloque (`BloqueDelHueco` monta el hijo al abrir) y la lista se lee entonces.
export const HuecoDeNotasDiferido = diferido(() =>
  import('./hueco-de-notas').then((modulo) => modulo.HuecoDeNotas),
)

export const HuecoDeHistorialDiferido = diferido(() =>
  import('./hueco-de-historial').then((modulo) => modulo.HuecoDeHistorial),
)

// La barra del lote aparece con el primer elegido: su código se pide entonces y no pesa en el JS en frío de la cadena (6.04-3).
export const BarraDelLoteDiferida = diferido(() =>
  import('./barra-del-lote').then((modulo) => modulo.BarraDelLote),
)

// El drawer del lote se pide al abrirse la primera vez (con la barra); `src/app` lo monta cerrado y el resto no pesa en frío.
export const DrawerDelLoteDiferido = diferido(() =>
  import('./drawer-del-lote').then((modulo) => modulo.DrawerDelLote),
)
