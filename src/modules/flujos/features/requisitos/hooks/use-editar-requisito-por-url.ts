'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import type { RequisitoParaConfigurar } from '../../../entities/flujo'
import {
  CLAVE_DEL_REQUISITO_A_EDITAR,
  CLAVE_EDITAR,
  MOTIVO_DE_REQUISITO_NO_DISPONIBLE,
  PANEL_EDITAR_REQUISITO,
} from '../../../entities/requisitos/vista-de-fase'

// Editar un requisito, en la URL (`?editar=requisito&requisito=<id>`): se puede recargar y «atrás» lo cierra, y no ocupa `?panel=` ni `?fase=`. Se monta una vez
// en el bloque. Un requisito que ya no está en la fase no abre (se avisa y la URL se limpia, escrita a mano también).
export function useEditarRequisitoPorUrl(requisitos: readonly RequisitoParaConfigurar[]) {
  const url = usePanelPorUrl(PANEL_EDITAR_REQUISITO, [CLAVE_DEL_REQUISITO_A_EDITAR], {
    clave: CLAVE_EDITAR,
  })
  const id = url.valor(CLAVE_DEL_REQUISITO_A_EDITAR)
  const apertura = useApertura(url.abierto)
  const buscado = requisitos.find((r) => r.id === id) ?? null
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto && buscado === null ? MOTIVO_DE_REQUISITO_NO_DISPONIBLE : null,
    url.cerrar,
  )
  return {
    requisito: url.abierto && !rechazada ? buscado : null,
    abrir: (requisitoId: string) => {
      url.abrir({ [CLAVE_DEL_REQUISITO_A_EDITAR]: requisitoId })
    },
    cerrar: url.cerrar,
  }
}
