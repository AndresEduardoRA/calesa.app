'use client'

import { PANEL_ELIMINAR_PAGO } from '../../../entities/dinero/paneles-de-pago'
import type { Pago } from '../../../entities/dinero/pago'
import { usePagoPorUrl } from './use-pago-por-url'

// Eliminar un pago en la URL (`?panel=eliminar-pago&pago=<id>`). Sólo abre sobre un pago sin confirmar y con la clave de editar.
export function useEliminarPagoPorUrl(
  pagos: readonly Pago[] | null,
  permisos: { puedeEditar: boolean | null; puedeConfirmar: boolean | null },
) {
  return usePagoPorUrl(PANEL_ELIMINAR_PAGO, pagos, permisos)
}
