'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import {
  CLAVE_DE_ACCION,
  MENSAJE_YA_NO_ESTA_ASI,
  PANEL_MODERAR,
} from '../../../entities/comentarios/marcas-url'
import type { AccionDeModerar } from '../../../entities/comentarios/moderacion'

// Qué se modera, en la URL de la guardada (`?panel=moderar&accion=invalidar|descartar|reactivar`): se puede recargar, «atrás» lo cierra, y una URL con una acción que
// ya no corresponde (la cotización cambió, o quien mira no modera) avisa y se limpia. Las acciones posibles las calculó el servidor.
export function useModeracionPorUrl(acciones: readonly AccionDeModerar[]) {
  const url = usePanelPorUrl(PANEL_MODERAR, [CLAVE_DE_ACCION])
  const pedida = url.valor(CLAVE_DE_ACCION)
  const apertura = useApertura(url.abierto)
  const posible = acciones.find((accion) => accion === pedida) ?? null
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${pedida ?? ''}` : null,
    url.abierto && posible === null ? MENSAJE_YA_NO_ESTA_ASI : null,
    url.cerrar,
  )
  return {
    accion: url.abierto && !rechazada ? posible : null,
    abrir: (accion: AccionDeModerar) => {
      url.abrir({ [CLAVE_DE_ACCION]: accion })
    },
    cerrar: url.cerrar,
  }
}
