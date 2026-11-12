'use client'

import { useLayoutEffect, useRef } from 'react'
import type { Mensaje } from '../../../entities/mensajes'

// Hasta cuántos píxeles del final se sigue lo nuevo.
const CERCA_DEL_FINAL_PX = 80

type Marca = { primero: string | null; ultimo: string | null; alto: number }

// ¿Se antepuso historia (cambió el primero y el último sigue siendo el mismo)?
function seAntepuso(antes: Marca, primero: Mensaje | undefined, ultimo: Mensaje | undefined) {
  return antes.primero !== null && primero?.id !== antes.primero && ultimo?.id === antes.ultimo
}

// ¿Llegó uno nuevo al final que haya que seguir? El propio siempre; el ajeno sólo si se estaba cerca del final.
function hayQueBajar(
  antes: Marca,
  el: HTMLElement,
  ultimo: Mensaje | undefined,
  usuarioId: string,
): boolean {
  if (!ultimo || ultimo.id === antes.ultimo) {
    return false
  }
  const cerca = antes.alto - el.scrollTop - el.clientHeight <= CERCA_DEL_FINAL_PX
  return antes.ultimo === null || ultimo.autorId === usuarioId || cerca
}

// El scroll del hilo: lo nuevo va abajo. Un mensaje propio, o uno ajeno estando cerca del final, baja; si la persona leyó más arriba no se la mueve.
// Al anteponer «Ver anteriores» se conserva la posición (se compensa lo que creció el alto). Sin animación: respeta `prefers-reduced-motion`.
export function useScrollDelHilo(mensajes: readonly Mensaje[], usuarioId: string) {
  const contenedor = useRef<HTMLDivElement>(null)
  const previo = useRef<Marca>({ primero: null, ultimo: null, alto: 0 })

  useLayoutEffect(() => {
    const el = contenedor.current
    if (!el) {
      return
    }
    const primero = mensajes[0]
    const ultimo = mensajes.at(-1)
    const antes = previo.current
    if (seAntepuso(antes, primero, ultimo)) {
      el.scrollTop += el.scrollHeight - antes.alto
    } else if (hayQueBajar(antes, el, ultimo, usuarioId)) {
      el.scrollTop = el.scrollHeight
    }
    previo.current = {
      primero: primero?.id ?? null,
      ultimo: ultimo?.id ?? null,
      alto: el.scrollHeight,
    }
  }, [mensajes, usuarioId])

  return contenedor
}
