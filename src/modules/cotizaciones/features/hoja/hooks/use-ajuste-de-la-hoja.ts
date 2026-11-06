'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { AJUSTE_DE_CELDA, CLAVE_DE_AJUSTE, CLAVE_DEL_NODO } from './urls-de-la-hoja'

// El ajuste de una celda abierto en la URL: el nodo que nombra (nulo si no hay uno abierto) y cómo cerrarlo. Qué celda es y si se dibuja ahora lo resuelve quien lo muestra
// (`celdaConAjuste`): la URL no abre lo que la hoja no enseña.
export type AjusteAbierto = { nodo: string | null; cerrar: () => void }

// El ⚙ de una celda en la URL (`?ajuste=celda&nodo=<id>`): recargar lo abre y «atrás» lo cierra. Sólo se llama con proveedor (`<LugaresConAjuste>`): sin él no hay ⚙, ni URL, ni
// vuelta del foco que registrar.
export function useAjusteDeLaHoja() {
  const panel = usePanelPorUrl(AJUSTE_DE_CELDA, [CLAVE_DEL_NODO], { clave: CLAVE_DE_AJUSTE })
  // El callback que reciben todas las celdas es uno solo y no cambia (la `XCell` está en `memo`): abre con la última función de la URL.
  const ultimo = useRef(panel.abrir)
  useEffect(() => {
    ultimo.current = panel.abrir
  })
  const alAjustar = useCallback((nodo: string) => {
    ultimo.current({ [CLAVE_DEL_NODO]: nodo })
  }, [])
  const abierto: AjusteAbierto = {
    nodo: panel.abierto ? panel.valor(CLAVE_DEL_NODO) : null,
    cerrar: panel.cerrar,
  }
  return { abierto, alAjustar }
}
