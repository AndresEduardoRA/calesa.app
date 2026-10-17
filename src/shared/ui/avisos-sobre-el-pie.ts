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
// Dónde salen los avisos (los valores de sonner): una columna de 356 px a 24 px del borde derecho y, en el celular (hasta 600 px), de lado
// a lado a 16 px. Un aviso suele medir menos de 160 px de alto: lo que está más arriba que eso no se solapa con el primero.
const ANCHO_DEL_AVISO = 356
const MARGEN_DE_ESCRITORIO = 24
const MARGEN_DEL_CELULAR = 16
const ANCHO_DEL_CELULAR = 600
const FRANJA_DE_ABAJO = 160

export type CajaDeUnPie = { top: number; bottom: number; left: number; right: number }

// Por dónde ocupan la pantalla los avisos: de izquierda a derecha.
function columnaDeAvisos(anchoDeLaVentana: number): { left: number; right: number } {
  if (anchoDeLaVentana <= ANCHO_DEL_CELULAR) {
    return { left: MARGEN_DEL_CELULAR, right: anchoDeLaVentana - MARGEN_DEL_CELULAR }
  }
  const right = anchoDeLaVentana - MARGEN_DE_ESCRITORIO
  return { left: right - ANCHO_DEL_AVISO, right }
}

// A cuántos píxeles del borde de abajo van los avisos para no tapar ningún pie. Sólo cuenta un pie que cae en su lugar (por la derecha
// de la pantalla y en la franja de abajo): un modal centrado en escritorio, o a media altura en el celular, no se solapa y los avisos
// no se mueven. De los que sí, manda el que está más arriba. Nulo = ninguno: los avisos van donde siempre.
export function avisosAbajo(
  ventana: { ancho: number; alto: number },
  pies: readonly CajaDeUnPie[],
): number | null {
  const columna = columnaDeAvisos(ventana.ancho)
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
        { ancho: window.innerWidth, alto: window.innerHeight },
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
