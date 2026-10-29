'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { AYUDA_DE_TEXTO, CLAVE_DE_AYUDA, CLAVE_DEL_NODO } from './urls-de-la-hoja'

// La ayuda de texto de una celda en la URL (`?ayuda=texto&nodo=<id>`): recargar la abre y «atrás» la cierra. Qué celda es y si se dibuja ahora lo resuelve quien la muestra
// (`celdaConAyudaDeTexto`): la URL no abre lo que la hoja no enseña.
export type AyudaDeLaHoja = {
  // El nodo que nombra la URL, si hay una ayuda de texto abierta.
  nodo: string | null
  cerrar: () => void
}

export function useAyudaDeLaHoja() {
  const url = usePanelPorUrl(AYUDA_DE_TEXTO, [CLAVE_DEL_NODO], { clave: CLAVE_DE_AYUDA })
  // El callback que reciben todas las celdas es uno solo y no cambia (la `XCell` está en `memo`): abre con la última función de la URL.
  const abrir = useRef(url.abrir)
  useEffect(() => {
    abrir.current = url.abrir
  })
  const alAyudar = useCallback((nodo: string) => {
    abrir.current({ [CLAVE_DEL_NODO]: nodo })
  }, [])
  const ayuda: AyudaDeLaHoja = {
    nodo: url.abierto ? url.valor(CLAVE_DEL_NODO) : null,
    cerrar: url.cerrar,
  }
  return { ayuda, alAyudar }
}
