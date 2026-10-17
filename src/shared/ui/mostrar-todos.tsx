'use client'

import { formatearNumero } from '@/shared/lib/formato'
import { Button } from './button'
import type { LecturaAPedido } from './use-lectura-a-pedido'

type Props = {
  // Cuántos tiene el grupo entero y cuántos todavía no se ven.
  total: number
  faltan: number
  lectura: LecturaAPedido<unknown>
  alPedir: () => void
  // Lo que ya no está (lo purgaron o restauraron mientras se miraba): recargar la página.
  alRecargar: () => void
}

// Al pie de un grupo que se ve recortado (un lote de la papelera, cierre 1): «Mostrar los 200» trae el resto. Mientras
// llega lo dice; si no llega, el motivo, con «Reintentar» (sin red, un error) o «Recargar» (el grupo ya no está).
export function MostrarTodos({ total, faltan, lectura, alPedir, alRecargar }: Props) {
  if (lectura.estado === 'leyendo') {
    return (
      <p
        role="status"
        aria-busy="true"
        className="px-3 py-2 text-(length:--text-sm) text-(--color-ink-soft)"
      >
        Trayendo los {formatearNumero(total)}…
      </p>
    )
  }
  if (lectura.estado === 'fallo') {
    const yaNoEsta = lectura.error.codigo === 'no_encontrado'
    return (
      <div
        role="status"
        className="flex flex-wrap items-center gap-2 px-3 py-2 text-(length:--text-sm) text-(--color-ink-soft)"
      >
        <span>{lectura.error.mensaje}</span>
        <Button variant="outline" className="h-11 md:h-8" onClick={yaNoEsta ? alRecargar : alPedir}>
          {yaNoEsta ? 'Recargar' : 'Reintentar'}
        </Button>
      </div>
    )
  }
  if (faltan <= 0) {
    return null
  }
  return (
    <div className="px-3 py-2">
      <Button variant="outline" className="h-11 md:h-8" onClick={alPedir}>
        Mostrar los {formatearNumero(total)}
      </Button>
    </div>
  )
}
