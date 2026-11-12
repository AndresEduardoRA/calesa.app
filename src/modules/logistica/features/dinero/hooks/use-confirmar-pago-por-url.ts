'use client'

import { PANEL_CONFIRMAR_PAGO } from '../../../entities/dinero/paneles-de-pago'
import type { Pago } from '../../../entities/dinero/pago'
import { usePagoPorUrl } from './use-pago-por-url'

// «Confirmar pago» en la URL (`?panel=confirmar-pago&pago=<id>`). Sólo abre sobre un pago sin confirmar y con la clave de confirmar.
export function useConfirmarPagoPorUrl(
  pagos: readonly Pago[] | null,
  permisos: { puedeEditar: boolean | null; puedeConfirmar: boolean | null },
) {
  return usePagoPorUrl(PANEL_CONFIRMAR_PAGO, pagos, permisos)
}
