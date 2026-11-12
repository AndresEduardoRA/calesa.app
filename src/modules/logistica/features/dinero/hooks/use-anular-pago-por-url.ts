'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { CLAVE_DE_PAGO, PANEL_ANULAR_PAGO } from '../../../entities/dinero/paneles-de-pago'
import type { Pago } from '../../../entities/dinero/pago'
import { usePagoPorUrl } from './use-pago-por-url'

// Anular un pago en la URL (`?panel=anular-pago&pago=<id>`). Sólo abre sobre un pago confirmado y con la clave de confirmar.
export function useAnularPagoPorUrl(
  pagos: readonly Pago[] | null,
  permisos: { puedeEditar: boolean | null; puedeConfirmar: boolean | null },
) {
  const url = usePanelPorUrl(PANEL_ANULAR_PAGO, [CLAVE_DE_PAGO])
  return usePagoPorUrl(PANEL_ANULAR_PAGO, url, pagos, permisos)
}
