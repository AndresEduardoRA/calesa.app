import type { ReactNode } from 'react'
import type { FilaDeItem } from '../../../entities/nucleo/item'

// Lo que la hoja le da a quien llena su hueco (8.10-2, C9): las filas vigentes, si se puede editar y si el proyecto está cerrado, y cómo cambiar una fila sin releerla
// (`cambio` recibe la fila **vigente**, así no pisa una celda guardada entretanto). Un id que ya no está no hace nada.
export type ApiDelHueco = {
  filas: readonly FilaDeItem[]
  puedeEditar: boolean
  cerrado: boolean
  cambiarFila: (id: string, cambio: (fila: FilaDeItem) => FilaDeItem) => void
}

// El hueco de la hoja (8.10-2, D4): otra área pone algo en cada fila (junto a «Imágenes») y un panel, sin que `items` la importe. Lo llena `src/app` (un área no importa
// otra): hoy, el stock del ítem (`src/app/(app)/repuestos/[id]/hoja-con-stock.tsx`).
export type HuecoDeLaHoja = {
  accionDeFila: (fila: FilaDeItem) => ReactNode
  panel: (api: ApiDelHueco) => ReactNode
}
