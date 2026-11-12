'use client'

import type { ErrorApp } from '@/shared/lib/errores'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { useEnLinea } from '@/shared/ui/use-en-linea'

type Props = {
  filas: number
  hayMas: boolean
  enElTope: boolean
  cargandoMas: boolean
  error: ErrorApp | null
  cargarMas: () => void
}

// Al pie: «Ver más» (o «Reintentar» si falló, con el motivo o «Sin conexión»); al llegar al tope lo dice con `<AvisoDeTope>`.
// Lo antiguo se alcanza abriendo la conversación por la persona (el buscador de «Nueva conversación»).
export function PieDeLaLista({ filas, hayMas, enElTope, cargandoMas, error, cargarMas }: Props) {
  const enLinea = useEnLinea()
  return (
    <div className="grid gap-2 px-3 py-2">
      {error ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          {enLinea ? error.mensaje : 'Sin conexión. No pudimos traer más conversaciones.'}
        </p>
      ) : null}
      {hayMas && enElTope ? (
        <AvisoDeTope texto={`Mostrando las ${String(filas)} conversaciones más recientes.`} />
      ) : hayMas ? (
        <Button
          variant="outline"
          className="h-11 w-fit md:h-9"
          disabled={cargandoMas}
          onClick={cargarMas}
        >
          {cargandoMas ? 'Cargando…' : error ? 'Reintentar' : 'Ver más'}
        </Button>
      ) : null}
    </div>
  )
}
