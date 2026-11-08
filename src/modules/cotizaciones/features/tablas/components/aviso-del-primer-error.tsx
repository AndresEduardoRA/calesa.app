'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import type { PrimerError } from '../../../entities/tablas/vista-del-editor'

type Props = {
  error: PrimerError
  alIr: () => void
  alDescartar: () => void
}

// El primer error de la tabla, arriba del editor (4.23-3, C7): mientras esté, no se publica. «Ir a la celda» cambia de página y pone el foco en ese campo; una celda de una
// columna que la tabla no declara (sembrada por SQL) no tiene campo: sólo se puede descartar.
export function AvisoDelPrimerError({ error, alIr, alDescartar }: Props) {
  return (
    <Aviso tono="peligro">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="min-w-0 break-words">{error.mensaje}</span>
        {error.conCelda ? (
          <Button type="button" variant="outline" className="min-h-11 md:min-h-8" onClick={alIr}>
            Ir a la celda
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-8"
            onClick={alDescartar}
          >
            Descartar los cambios
          </Button>
        )}
      </div>
    </Aviso>
  )
}
