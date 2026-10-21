'use client'

import { useLayoutEffect, useState, type RefObject } from 'react'

// Cuánto tiene que medir, en rem, el contenedor de un listado para que su panel de filtros vaya al costado: el panel (15 rem), el hueco (1)
// y lo que la lista necesita para que una fila se lea (24: el nombre hasta 16 rem, el «⋯» y el relleno). Está escrito también en
// `CuerpoDeLaLista` (`@min-[40rem]:`): Tailwind lee las clases literales, así que un cambio va en los dos lugares (`filter-shell.test.tsx`
// lo comprueba). Un corte por el ancho de la pantalla no sirve: con el texto al 200 % los 15 rem son 480 px y dejaban 176 a la lista.
export const REM_PARA_EL_PANEL_AL_COSTADO = 40

const alRem = (px: number): number => {
  const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  return px / (Number.isFinite(rem) && rem > 0 ? rem : 16)
}

// ¿El contenedor mide al menos `REM_PARA_EL_PANEL_AL_COSTADO` rem? Antes de medir, `inicial` (lo que supuso el servidor por el ancho de la
// pantalla, así no hay salto al hidratar); después, el contenedor de verdad, también cuando cambia el tamaño del texto. Lo que se dibuja
// lo decide el CSS con la misma regla (`@min-[40rem]:`): esto decide lo que hace el botón «Filtros» (plegar el panel o abrir la hoja).
export function usePanelAlCostado(
  contenedor: RefObject<HTMLElement | null>,
  inicial: boolean,
): boolean {
  const [alCostado, setAlCostado] = useState(inicial)
  useLayoutEffect(() => {
    const elemento = contenedor.current
    if (!elemento) {
      return undefined
    }
    const medir = () => {
      setAlCostado(alRem(elemento.clientWidth) >= REM_PARA_EL_PANEL_AL_COSTADO)
    }
    medir()
    // jsdom (las pruebas unitarias) no trae `ResizeObserver`: ahí se mide una vez.
    if (typeof ResizeObserver === 'undefined') {
      return undefined
    }
    // El texto al 200 % cambia el `rem` (y casi siempre el ancho del contenedor); si el ancho en px quedara igual, el cambio de `style`
    // de la raíz lo avisa.
    const observador = new ResizeObserver(medir)
    observador.observe(elemento)
    const cambioDeTexto = new MutationObserver(medir)
    cambioDeTexto.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    })
    return () => {
      observador.disconnect()
      cambioDeTexto.disconnect()
    }
  }, [contenedor])
  return alCostado
}
