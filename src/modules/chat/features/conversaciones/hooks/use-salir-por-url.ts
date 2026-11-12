'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { puedeSalirDe } from '../../../entities/escritura'
import type { Conversacion } from '../../../entities/conversaciones'

// `?panel=salir`: dejar la conversación abierta (`?c=`). Sin claves nombradas: abrirlo o cerrarlo no toca `?c=`.
export const PANEL_SALIR_DE_LA_CONVERSACION = 'salir'

// Quien dibuja el menú del hilo pide abrir el diálogo.
export const useAbrirSalir = () => usePanelPorUrl(PANEL_SALIR_DE_LA_CONVERSACION)

// El diálogo de salir sobre la conversación abierta. Se abre si la URL lo pide y esa conversación se puede dejar: con la fila cargada,
// una directa no abre nada; sin ella (más vieja que lo cargado) abre y la base responde si no se podía (22023), dentro del diálogo.
export function useSalirPorUrl(abierta: string | null, filas: readonly Conversacion[]) {
  const url = usePanelPorUrl(PANEL_SALIR_DE_LA_CONVERSACION)
  const conversacion = abierta === null ? null : (filas.find((f) => f.id === abierta) ?? null)
  const sePuede = abierta !== null && (conversacion === null || puedeSalirDe(conversacion))
  return { abierto: url.abierto && sePuede, abierta, conversacion, cerrar: url.cerrar }
}
