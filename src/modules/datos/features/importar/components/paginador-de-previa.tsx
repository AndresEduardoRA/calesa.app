'use client'

import { Button } from '@/shared/ui/button'

type Props = { actual: number; paginas: number; alCambiar: (pagina: number) => void }

// Anterior y Siguiente de la vista previa: 50 filas en pantalla de las 500 que se muestran.
export function PaginadorDePrevia({ actual, paginas, alCambiar }: Props) {
  return (
    <nav
      aria-label="Páginas de la vista previa"
      className="flex items-center justify-between gap-2"
    >
      <Button
        type="button"
        variant="outline"
        className="h-11 md:h-9"
        disabled={actual === 0}
        onClick={() => {
          alCambiar(actual - 1)
        }}
      >
        Anterior
      </Button>
      <span className="text-(length:--text-sm) tabular-nums">
        Página {actual + 1} de {paginas}
      </span>
      <Button
        type="button"
        variant="outline"
        className="h-11 md:h-9"
        disabled={actual >= paginas - 1}
        onClick={() => {
          alCambiar(actual + 1)
        }}
      >
        Siguiente
      </Button>
    </nav>
  )
}
