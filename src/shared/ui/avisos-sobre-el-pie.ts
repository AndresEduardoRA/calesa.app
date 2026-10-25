'use client'

import { useEffect } from 'react'

// Los pies de un panel o de un modal: el del `<Drawer>` (`sheet-footer`), el del `<Modal>` (`dialog-footer`) y los que van dentro del
// cuerpo (`<PieDelPanel>`, `<PieConSalida>`, con `data-pie-de-panel`).
export const SELECTOR_DE_PIES =
  '[data-slot="sheet-footer"], [data-slot="dialog-footer"], [data-pie-de-panel]'

// La variable que lee el `<Toaster>` como su margen de abajo (`sonner.tsx`).
export const VARIABLE_DE_AVISOS = '--avisos-abajo'

// Lo que se deja entre el aviso y el pie.
const MARGEN = 16
// Dónde salen los avisos: una columna de 22,25 rem (356 px con el texto al 100 %: `ANCHO_DEL_AVISO` de `sonner.tsx`, que crece con el texto
// y no pasa de la pantalla menos 1 rem por lado) a 24 px del borde derecho y, en el celular (hasta 600 px), de lado a lado a 16 px.
// Un aviso suele medir menos de 160 px de alto: lo que está más arriba que eso no se solapa con el primero.
const ANCHO_DEL_AVISO_EN_REM = 22.25
const PX_POR_REM = 16
const MARGEN_DE_ESCRITORIO = 24
const MARGEN_DEL_CELULAR = 16
const ANCHO_DEL_CELULAR = 600
const FRANJA_DE_ABAJO = 160

export type CajaDeUnPie = { top: number; bottom: number; left: number; right: number }

// Con la barra lateral a la vista (`[data-barra-lateral]`, desde 768 px) los avisos salen abajo a la izquierda, sobre la barra, con su ancho menos 2 rem (4-15,
// `src/app/globals.css`): ahí ningún panel tiene su pie, pero la columna se calcula igual por si un pie ancho llega hasta ahí.
const ANCHO_DE_LA_BARRA_EN_REM = 15.5
const ANCHO_DEL_AVISO_EN_LA_BARRA_EN_REM = ANCHO_DE_LA_BARRA_EN_REM - 2
const ANCHO_CON_BARRA = 768

// Por dónde ocupan la pantalla los avisos: de izquierda a derecha. `rem`: cuántos píxeles mide 1 rem (el texto al 200 % lo duplica).
function columnaDeAvisos(
  anchoDeLaVentana: number,
  rem: number,
  conBarra: boolean,
): { left: number; right: number } {
  if (anchoDeLaVentana <= ANCHO_DEL_CELULAR) {
    return { left: MARGEN_DEL_CELULAR, right: anchoDeLaVentana - MARGEN_DEL_CELULAR }
  }
  if (conBarra && anchoDeLaVentana >= ANCHO_CON_BARRA) {
    return {
      left: MARGEN_DE_ESCRITORIO,
      right: MARGEN_DE_ESCRITORIO + ANCHO_DEL_AVISO_EN_LA_BARRA_EN_REM * rem,
    }
  }
  const right = anchoDeLaVentana - MARGEN_DE_ESCRITORIO
  const ancho = Math.min(ANCHO_DEL_AVISO_EN_REM * rem, anchoDeLaVentana - 2 * rem)
  return { left: right - ancho, right }
}

// A cuántos píxeles del borde de abajo van los avisos para no tapar ningún pie. Sólo cuenta un pie que cae en su lugar (por la derecha
// de la pantalla y en la franja de abajo): un modal centrado en escritorio, o a media altura en el celular, no se solapa y los avisos
// no se mueven. De los que sí, manda el que está más arriba. Nulo = ninguno: los avisos van donde siempre.
export function avisosAbajo(
  ventana: { ancho: number; alto: number; rem?: number; conBarra?: boolean },
  pies: readonly CajaDeUnPie[],
): number | null {
  const columna = columnaDeAvisos(
    ventana.ancho,
    ventana.rem ?? PX_POR_REM,
    ventana.conBarra ?? false,
  )
  const tapan = pies.filter(
    (pie) =>
      [pie.top, pie.bottom, pie.left, pie.right].every(Number.isFinite) &&
      pie.top < ventana.alto &&
      pie.bottom > ventana.alto - FRANJA_DE_ABAJO &&
      pie.right > columna.left &&
      pie.left < columna.right,
  )
  if (tapan.length === 0) {
    return null
  }
  return Math.round(ventana.alto - Math.min(...tapan.map((pie) => pie.top)) + MARGEN)
}

function cajasDeLosPies(): CajaDeUnPie[] {
  return [...document.querySelectorAll<HTMLElement>(SELECTOR_DE_PIES)]
    .filter((pie) => pie.getClientRects().length > 0)
    .map((pie) => {
      const { top, bottom, left, right } = pie.getBoundingClientRect()
      return { top, bottom, left, right }
    })
}

// Pone en `<html>` cuánto subir los avisos mientras haya un pie de panel a la vista (cierre 3): el aviso sale abajo a la derecha, justo
// donde un panel tiene sus botones, y los tapaba. Mide al abrir y cerrar un panel (lo que entra o sale del DOM), al cambiar de tamaño
// (también con el texto al 200 %: el pie se hace más alto) y al terminar de deslizarse un panel.
export function useAvisosSobreElPie(): void {
  useEffect(() => {
    const raiz = document.documentElement
    let cuadro = 0
    const medir = () => {
      cuadro = 0
      const abajo = avisosAbajo(
        {
          ancho: window.innerWidth,
          alto: window.innerHeight,
          rem: Number.parseFloat(getComputedStyle(raiz).fontSize) || PX_POR_REM,
          conBarra:
            (document.querySelector('[data-barra-lateral]')?.getClientRects().length ?? 0) > 0,
        },
        cajasDeLosPies(),
      )
      if (abajo === null) {
        raiz.style.removeProperty(VARIABLE_DE_AVISOS)
      } else {
        raiz.style.setProperty(VARIABLE_DE_AVISOS, `${String(abajo)}px`)
      }
    }
    const programar = () => {
      if (cuadro === 0) {
        cuadro = requestAnimationFrame(medir)
      }
    }
    const alto = new ResizeObserver(programar)
    const observarPies = () => {
      alto.disconnect()
      document.querySelectorAll(SELECTOR_DE_PIES).forEach((pie) => {
        alto.observe(pie)
      })
    }
    const cambios = new MutationObserver(() => {
      observarPies()
      programar()
    })
    cambios.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', programar)
    document.addEventListener('transitionend', programar, true)
    document.addEventListener('animationend', programar, true)
    observarPies()
    programar()
    return () => {
      cambios.disconnect()
      alto.disconnect()
      window.removeEventListener('resize', programar)
      document.removeEventListener('transitionend', programar, true)
      document.removeEventListener('animationend', programar, true)
      cancelAnimationFrame(cuadro)
      raiz.style.removeProperty(VARIABLE_DE_AVISOS)
    }
  }, [])
}
