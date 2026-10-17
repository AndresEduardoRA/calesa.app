'use client'

import { useEffect, useState, type RefObject } from 'react'

export type Desborde = { izquierda: boolean; derecha: boolean }

// Una barra que se desplaza de costado (las secciones de la ficha, las etapas del kanban en el celular) tiene que decir que hay
// más: si no, lo que queda afuera no existe para quien mira (`.claude/rules/ui.md`). Dice si queda algo escondido a cada lado, y se
// vuelve a medir al desplazar y al cambiar el tamaño (girar el celular, texto al 200 %).
export function useDesborde(ref: RefObject<HTMLElement | null>): Desborde {
  const [desborde, setDesborde] = useState<Desborde>({ izquierda: false, derecha: false })
  useEffect(() => {
    const barra = ref.current
    if (!barra) {
      return
    }
    const medir = () => {
      const izquierda = barra.scrollLeft > 1
      const derecha = barra.scrollLeft + barra.clientWidth < barra.scrollWidth - 1
      setDesborde((antes) =>
        antes.izquierda === izquierda && antes.derecha === derecha ? antes : { izquierda, derecha },
      )
    }
    medir()
    barra.addEventListener('scroll', medir, { passive: true })
    const observador = new ResizeObserver(medir)
    observador.observe(barra)
    for (const hijo of barra.children) {
      observador.observe(hijo)
    }
    return () => {
      barra.removeEventListener('scroll', medir)
      observador.disconnect()
    }
  }, [ref])
  return desborde
}
