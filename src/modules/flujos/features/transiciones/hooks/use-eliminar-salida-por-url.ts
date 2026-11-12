'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { TransicionParaConfigurar } from '../../../entities/flujo'
import {
  CLAVE_DE_LA_SALIDA_A_QUITAR,
  CLAVE_ELIMINAR,
  MOTIVO_DE_SALIDA_NO_DISPONIBLE,
  PANEL_ELIMINAR_SALIDA,
} from '../../../entities/transiciones/vista-de-salidas'

// La confirmación de «Quitar» una salida, en la URL (`?eliminar=salida&salida=<id>`): se puede recargar y «atrás» la cierra, y no ocupa `?panel=` ni `?fase=`
// (el inspector sigue abierto debajo). Se monta una vez en el bloque, no una por fila. Una salida que ya no está en la fase no abre (se avisa y la URL se
// limpia, escrita a mano también); mientras se va, el diálogo conserva la última que vio.
export function useEliminarSalidaPorUrl(salidas: readonly TransicionParaConfigurar[]) {
  const url = usePanelPorUrl(PANEL_ELIMINAR_SALIDA, [CLAVE_DE_LA_SALIDA_A_QUITAR], {
    clave: CLAVE_ELIMINAR,
  })
  const id = url.valor(CLAVE_DE_LA_SALIDA_A_QUITAR)
  const apertura = useApertura(url.abierto)
  const buscada = salidas.find((s) => s.id === id) ?? null
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto && buscada === null ? MOTIVO_DE_SALIDA_NO_DISPONIBLE : null,
    url.cerrar,
  )
  const salida = useUltimo(url.abierto && !rechazada ? buscada : null)
  return {
    abierto: url.abierto && !rechazada && buscada !== null,
    salida,
    abrir: (salidaId: string) => {
      url.abrir({ [CLAVE_DE_LA_SALIDA_A_QUITAR]: salidaId })
    },
    cerrar: url.cerrar,
  }
}
