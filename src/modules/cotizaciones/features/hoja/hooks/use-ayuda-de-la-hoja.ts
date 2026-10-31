'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { SeccionDeHoja } from '../../../entities/hoja'
import { tiposDeAyuda } from '../../../entities/presentacion-de-la-hoja'
import { AYUDA_DE_TABLA, AYUDA_DE_TEXTO, CLAVE_DE_AYUDA, CLAVE_DEL_NODO } from './urls-de-la-hoja'

// Una ayuda abierta en la URL: el nodo que nombra (nulo si no hay una de su tipo abierta) y cómo cerrarla. Qué celda es y si se dibuja ahora lo resuelve quien la muestra
// (`celdaConAyuda`): la URL no abre lo que la hoja no enseña.
export type AyudaAbierta = {
  nodo: string | null
  cerrar: () => void
}

// De dónde lee el panel de una tabla: el origen y la hoja abierta de la hoja montada (la misma del recálculo y del guardado), opaca.
export type DeDondeLeer = { origenId: string; abierta: string }

// Las dos ayudas de una celda en la URL (`?ayuda=texto&nodo=<id>` y `?ayuda=tabla&nodo=<id>`): recargar la abre y «atrás» la cierra.
export type AyudaDeLaHoja = {
  texto: AyudaAbierta
  tabla: AyudaAbierta
  lectura: DeDondeLeer
}

export function useAyudaDeLaHoja(secciones: readonly SeccionDeHoja[], lectura: DeDondeLeer) {
  const deTexto = usePanelPorUrl(AYUDA_DE_TEXTO, [CLAVE_DEL_NODO], { clave: CLAVE_DE_AYUDA })
  const deTabla = usePanelPorUrl(AYUDA_DE_TABLA, [CLAVE_DEL_NODO], { clave: CLAVE_DE_AYUDA })
  // El callback que reciben todas las celdas es uno solo y no cambia (la `XCell` está en `memo`): abre con las últimas funciones de la URL y decide el tipo por la ayuda de la
  // celda de ese nodo, con las últimas secciones.
  const ultimo = useRef({ secciones, abrirTexto: deTexto.abrir, abrirTabla: deTabla.abrir })
  useEffect(() => {
    ultimo.current = { secciones, abrirTexto: deTexto.abrir, abrirTabla: deTabla.abrir }
  })
  const alAyudar = useCallback((nodo: string) => {
    const { secciones: actuales, abrirTexto, abrirTabla } = ultimo.current
    const abrir = tiposDeAyuda(actuales).get(nodo) === 'tabla' ? abrirTabla : abrirTexto
    abrir({ [CLAVE_DEL_NODO]: nodo })
  }, [])
  const ayuda: AyudaDeLaHoja = {
    texto: {
      nodo: deTexto.abierto ? deTexto.valor(CLAVE_DEL_NODO) : null,
      cerrar: deTexto.cerrar,
    },
    tabla: {
      nodo: deTabla.abierto ? deTabla.valor(CLAVE_DEL_NODO) : null,
      cerrar: deTabla.cerrar,
    },
    lectura,
  }
  return { ayuda, alAyudar }
}
