'use client'

import { Button } from '@/shared/ui/button'
import type { Seguimientos } from '../hooks/use-seguimientos'
import { AvisoDelTopeDiferido, IrAUnaFechaDiferido } from './diferidos'

type Props = { seguimientos: Seguimientos; zona: string }

// Debajo de la lista: «Ver más» hasta el tope; en el tope, el aviso. Con más hacia atrás (o desde una
// fecha), «Ir a una fecha».
export function PieDeLaLinea({ seguimientos, zona }: Props) {
  const { hayMas, enElTope, cargando, desde } = seguimientos
  return (
    <div className="grid gap-3">
      {hayMas && enElTope ? (
        <AvisoDelTopeDiferido seguimientos={seguimientos} zona={zona} />
      ) : hayMas ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-fit md:min-h-9"
          onClick={() => void seguimientos.cargarMas()}
          disabled={cargando}
        >
          {cargando ? 'Cargando…' : 'Ver más'}
        </Button>
      ) : null}
      {hayMas || desde !== null ? (
        <IrAUnaFechaDiferido
          zona={zona}
          ocupado={cargando}
          alIr={(dia) => void seguimientos.irAUnaFecha(dia, zona)}
        />
      ) : null}
    </div>
  )
}
