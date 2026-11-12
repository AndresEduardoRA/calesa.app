import type { KeyboardEvent } from 'react'
import type { OpcionDelBuscador } from './tipos-del-buscador'

type Contexto = {
  abierta: boolean
  opciones: readonly OpcionDelBuscador[]
  activa: number
  alCerrar: () => void
  alAbrir: () => void
  alMover: (activa: number) => void
  alElegir: (opcion: OpcionDelBuscador) => void
}

// Las teclas del combobox: flechas mueven, Enter elige la activa y Esc cierra la lista (sin cerrar el panel que la contiene: se detiene).
export function teclaDelBuscador(evento: KeyboardEvent, c: Contexto): void {
  const ultima = c.opciones.length - 1
  if (evento.key === 'Escape' && c.abierta) {
    evento.preventDefault()
    evento.stopPropagation()
    c.alCerrar()
  } else if (evento.key === 'ArrowDown' && ultima >= 0) {
    evento.preventDefault()
    c.alAbrir()
    c.alMover(Math.min(c.activa + 1, ultima))
  } else if (evento.key === 'ArrowUp' && ultima >= 0) {
    evento.preventDefault()
    c.alMover(Math.max(c.activa - 1, 0))
  } else if (evento.key === 'Enter' && c.abierta) {
    const opcion = c.opciones[c.activa]
    if (opcion) {
      evento.preventDefault()
      c.alElegir(opcion)
    }
  }
}
