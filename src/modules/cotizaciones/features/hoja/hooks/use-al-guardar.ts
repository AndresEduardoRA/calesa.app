'use client'

import type { RefObject } from 'react'
import { useAtajo } from '@/shared/ui/atajos'
import { confirmarCeldaAbierta } from './confirmar-celda-abierta'
import type { ArmarDe, GuardadoDe } from './use-nucleo-del-guardado'

// Qué hace «Guardar» (y `Ctrl/Cmd+S`), en la hoja nueva y en una guardada: confirma la celda abierta y pide el guardado. Lo que se acaba de confirmar puede arreglar el motivo para
// no guardar, así que sólo se frena si la celda no es válida o si no hay celda que confirmar y el motivo sigue. Sin guardado (una hoja de sólo lectura), ni botón ni atajo.
export function useAlGuardar<A>({
  guardado,
  motivo,
  armar,
  raiz,
}: {
  guardado: GuardadoDe<A> | null
  motivo: string | null
  armar: ArmarDe<A>
  raiz: RefObject<HTMLDivElement | null>
}): () => void {
  const alGuardar = () => {
    if (guardado === null || guardado.ocupado) {
      return
    }
    const celda = confirmarCeldaAbierta(raiz.current)
    if (celda === 'invalida' || (celda === 'ninguna' && motivo !== null)) {
      return
    }
    guardado.guardar(armar)
  }
  useAtajo('guardar', alGuardar, guardado !== null)
  return alGuardar
}
