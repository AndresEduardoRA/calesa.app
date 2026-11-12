'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { RequisitoParaConfigurar } from '../../../entities/flujo'
import {
  CLAVE_DEL_REQUISITO_A_QUITAR,
  CLAVE_ELIMINAR,
  MOTIVO_DE_REQUISITO_NO_DISPONIBLE,
  PANEL_ELIMINAR_REQUISITO,
} from '../../../entities/requisitos/vista-de-fase'

// La confirmación de «Quitar» un requisito, en la URL (`?eliminar=requisito&quitar=<id>`): se puede recargar y «atrás» la cierra, y no ocupa `?panel=` ni
// `?fase=` (el inspector sigue abierto debajo). Se monta una vez en el bloque, no una por fila. Un requisito que ya no está en la fase no abre (se avisa y la
// URL se limpia, escrita a mano también); mientras se va, el diálogo conserva el último que vio.
export function useEliminarRequisitoPorUrl(requisitos: readonly RequisitoParaConfigurar[]) {
  const url = usePanelPorUrl(PANEL_ELIMINAR_REQUISITO, [CLAVE_DEL_REQUISITO_A_QUITAR], {
    clave: CLAVE_ELIMINAR,
  })
  const id = url.valor(CLAVE_DEL_REQUISITO_A_QUITAR)
  const apertura = useApertura(url.abierto)
  const buscado = requisitos.find((r) => r.id === id) ?? null
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto && buscado === null ? MOTIVO_DE_REQUISITO_NO_DISPONIBLE : null,
    url.cerrar,
  )
  const requisito = useUltimo(url.abierto && !rechazada ? buscado : null)
  return {
    abierto: url.abierto && !rechazada && buscado !== null,
    requisito,
    abrir: (requisitoId: string) => {
      url.abrir({ [CLAVE_DEL_REQUISITO_A_QUITAR]: requisitoId })
    },
    cerrar: url.cerrar,
  }
}
