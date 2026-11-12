'use client'

import { diferido } from '@/shared/ui/diferido'
import type { PropsDeLaPaleta } from './paleta'

// La paleta con `cmdk`, el cuadro, las filas y los hooks de búsqueda se piden la primera vez que se abre: el shell monta el botón en **todas** las pantallas y no puede
// cargarlos para dibujarlo. Mientras llega el código no se dibuja nada (el botón ya respondió al clic; el código suele estar pedido desde el puntero).
export const PaletaDiferida = diferido<PropsDeLaPaleta>(() =>
  import('./paleta').then((m) => m.Paleta),
)

// Pide el código sin abrir nada: se llama al llegar el puntero al botón y al tomar el foco. Un fallo acá no se dice: nadie pidió nada todavía.
export function adelantarLaPaleta() {
  void import('./paleta').catch(() => undefined)
}
