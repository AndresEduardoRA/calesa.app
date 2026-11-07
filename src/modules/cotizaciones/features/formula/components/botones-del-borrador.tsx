'use client'

import { Button } from '@/shared/ui/button'

type Props = {
  // Cada uno, sólo si se ofrece: «Editar» (4.21-3a-1), «Publicar…» (al día, 4.20-2b) y «Descartar…» (4.20-2c).
  alEditar?: () => void
  alPublicar?: () => void
  alDescartar?: () => void
}

// Los botones de la tarjeta del borrador, en su orden; sin ninguno, nada.
export function BotonesDelBorrador({ alEditar, alPublicar, alDescartar }: Props) {
  if (!alEditar && !alPublicar && !alDescartar) {
    return null
  }
  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {alEditar ? (
        <Button type="button" variant="outline" className="min-h-11 md:min-h-9" onClick={alEditar}>
          Editar
        </Button>
      ) : null}
      {alPublicar ? (
        <Button type="button" className="min-h-11 md:min-h-9" onClick={alPublicar}>
          Publicar…
        </Button>
      ) : null}
      {alDescartar ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          onClick={alDescartar}
        >
          Descartar…
        </Button>
      ) : null}
    </div>
  )
}
