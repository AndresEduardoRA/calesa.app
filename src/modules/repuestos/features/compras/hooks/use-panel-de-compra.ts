'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { FilaDeCompra } from '../../../entities/compras/compra'
import {
  CLAVE_DE_COMPRA,
  COMPRA_NUEVA,
  compraDeLaUrl,
  MENSAJE_COMPRA_YA_NO_ESTA,
  PANEL_COMPRA,
} from '../../../entities/compras/paneles'

// El formulario de una compra en la URL (`?panel=compra&compra=<id|nueva>`, 8.11-3, C10): se puede recargar y «atrás» lo cierra; `?pestana=compras` se conserva.
// Un id que no está entre las filas, o la URL escrita a mano sin poder escribir (`motivo`), no abre: se avisa una vez y la URL se limpia.
export function usePanelDeCompra(filas: readonly FilaDeCompra[], motivo: string | null) {
  const url = usePanelPorUrl(PANEL_COMPRA, [CLAVE_DE_COMPRA])
  const valor = url.valor(CLAVE_DE_COMPRA)
  const apertura = useApertura(url.abierto)
  const editada = compraDeLaUrl(filas, valor)
  const rechazo =
    motivo ?? (valor !== COMPRA_NUEVA && editada === null ? MENSAJE_COMPRA_YA_NO_ESTA : null)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${valor ?? ''}` : null,
    url.abierto ? rechazo : null,
    url.cerrar,
  )
  const abierto = url.abierto && !rechazada
  // Mientras se va, el panel conserva la última compra que mostró.
  const ultima = useUltimo(abierto ? editada : null)
  return {
    abierto,
    apertura,
    original: abierto ? editada : ultima,
    abrirNueva: () => {
      url.abrir({ [CLAVE_DE_COMPRA]: COMPRA_NUEVA })
    },
    abrirEdicion: (id: string) => {
      url.abrir({ [CLAVE_DE_COMPRA]: id })
    },
    cerrar: url.cerrar,
  }
}
