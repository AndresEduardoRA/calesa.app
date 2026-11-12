'use client'

import type { ErrorApp } from '@/shared/lib/errores'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { useEnLinea } from '@/shared/ui/use-en-linea'

type Props = {
  filas: number
  hayMas: boolean
  cargandoMas: boolean
  error: ErrorApp | null
  verMas: () => void
}

// Al pie: «Ver más» (o «Reintentar» si falló, con el motivo o «Sin conexión»), y al llegar al tope lo dice con
// `<AvisoDeTope>`: lo antiguo se purga a los 90 días, no hay otro camino.
export function PieDeLaLista({ filas, hayMas, cargandoMas, error, verMas }: Props) {
  const enLinea = useEnLinea()
  return (
    <>
      {error ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          {enLinea ? error.mensaje : 'Sin conexión. No pudimos traer más notificaciones.'}
        </p>
      ) : null}
      {hayMas && filas >= TOPE_DE_LO_CARGADO ? (
        <AvisoDeTope texto={`Mostrando las ${String(filas)} más recientes.`} />
      ) : hayMas ? (
        <Button
          variant="outline"
          className="h-11 w-fit md:h-9"
          disabled={cargandoMas}
          onClick={verMas}
        >
          {cargandoMas ? 'Cargando…' : error ? 'Reintentar' : 'Ver más'}
        </Button>
      ) : null}
    </>
  )
}
