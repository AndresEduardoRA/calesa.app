'use client'

import { useEffect, useState, type RefObject } from 'react'

export type Desborde = { izquierda: boolean; derecha: boolean }
export type DesbordeVertical = { arriba: boolean; abajo: boolean }

type Medidas = Pick<
  HTMLElement,
  'scrollLeft' | 'clientWidth' | 'scrollWidth' | 'scrollTop' | 'clientHeight' | 'scrollHeight'
>

// Qué queda escondido a cada lado de lo que se desplaza. Un píxel de tolerancia: con el texto al 200 % y los tamaños fraccionarios, el final de
// un desplazamiento queda a 0,5 px del borde y no debe contar como «sigue».
export function desbordeHorizontal(e: Medidas): Desborde {
  return {
    izquierda: e.scrollLeft > 1,
    derecha: e.scrollLeft + e.clientWidth < e.scrollWidth - 1,
  }
}

export function desbordeVertical(e: Medidas): DesbordeVertical {
  return {
    arriba: e.scrollTop > 1,
    abajo: e.scrollTop + e.clientHeight < e.scrollHeight - 1,
  }
}

// Lo común de los dos ejes: mide al montar, al desplazar y al cambiar el tamaño de la caja o de lo que lleva (girar el celular, texto al 200 %);
// `vigilarContenido` también vuelve a medir cuando se agrega o se quita algo adentro (un aviso en el cuerpo de un modal agranda lo que hay que
// desplazar sin cambiar el tamaño de la caja, que el alto máximo mantiene).
function useMedida<T extends Record<string, boolean>>(
  ref: RefObject<HTMLElement | null>,
  medir: (e: HTMLElement) => T,
  inicial: T,
  vigilarContenido: boolean,
): T {
  const [desborde, setDesborde] = useState<T>(inicial)
  useEffect(() => {
    const barra = ref.current
    if (!barra) {
      return
    }
    const leer = () => {
      const nuevo = medir(barra)
      setDesborde((antes) =>
        Object.keys(nuevo).every((clave) => antes[clave] === nuevo[clave]) ? antes : nuevo,
      )
    }
    leer()
    barra.addEventListener('scroll', leer, { passive: true })
    const observador = new ResizeObserver(leer)
    observador.observe(barra)
    for (const hijo of barra.children) {
      observador.observe(hijo)
    }
    const cambios = vigilarContenido ? new MutationObserver(leer) : null
    cambios?.observe(barra, { childList: true, subtree: true })
    return () => {
      barra.removeEventListener('scroll', leer)
      observador.disconnect()
      cambios?.disconnect()
    }
  }, [ref, medir, vigilarContenido])
  return desborde
}

const SIN_DESBORDE: Desborde = { izquierda: false, derecha: false }
const SIN_DESBORDE_VERTICAL: DesbordeVertical = { arriba: false, abajo: false }

// Una barra que se desplaza de costado (las secciones de la ficha, las etapas del kanban en el celular) tiene que decir que hay
// más: si no, lo que queda afuera no existe para quien mira (`.claude/rules/ui.md`). Dice si queda algo escondido a cada lado, y se
// vuelve a medir al desplazar y al cambiar el tamaño (girar el celular, texto al 200 %).
export function useDesborde(ref: RefObject<HTMLElement | null>): Desborde {
  return useMedida(ref, desbordeHorizontal, SIN_DESBORDE, false)
}

// Lo mismo hacia arriba y hacia abajo: el cuerpo de un modal que se desplaza (5a-24). Con el texto al 200 % el selector de iconos no cabe y la
// rejilla asomaba cortada sobre el pie, sin nada que dijera que seguía.
export function useDesbordeVertical(ref: RefObject<HTMLElement | null>): DesbordeVertical {
  return useMedida(ref, desbordeVertical, SIN_DESBORDE_VERTICAL, true)
}
