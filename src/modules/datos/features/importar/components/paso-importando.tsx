'use client'

import { formatearNumero } from '@/shared/lib/formato'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import type { LanzarImportacion } from '../hooks/use-lanzar-importacion'

type Props = {
  lanzar: LanzarImportacion
  alVolverALaPrevia: () => void
  alImportarOtro: () => void
}

// El cuarto paso: preparar el archivo, subirlo y crear la importación. Desde acá la función la procesa sola: se puede salir de la pantalla.
// (9.06-5 cambia «La importación empezó» por el avance leído de la base y el resultado.)
export function PasoImportando({ lanzar, alVolverALaPrevia, alImportarOtro }: Props) {
  const { locale } = useRegional()
  const { fase } = lanzar
  const numero = (n: number) => formatearNumero(n, { locale })
  return (
    <div className="grid gap-4">
      <p aria-live="polite" className="text-(length:--text-sm)">
        {fase.tipo === 'preparando'
          ? `Preparando el archivo… ${numero(fase.hechas)} de ${numero(fase.total)} filas.`
          : fase.tipo === 'subiendo'
            ? 'Subiendo el archivo…'
            : fase.tipo === 'lanzada'
              ? 'La importación empezó: puedes seguir en otra pantalla.'
              : ''}
      </p>
      {fase.tipo === 'error' ? <Aviso tono="peligro">{fase.mensaje}</Aviso> : null}
      <div className="flex flex-wrap justify-end gap-2">
        {fase.tipo === 'error' ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-9"
            onClick={() => {
              lanzar.volver()
              alVolverALaPrevia()
            }}
          >
            Volver a la vista previa
          </Button>
        ) : null}
        {fase.tipo === 'error' && fase.reintentable ? (
          <Button
            type="button"
            className="h-11 md:h-9"
            disabled={lanzar.ocupado}
            onClick={lanzar.reintentar}
          >
            Reintentar
          </Button>
        ) : null}
        {fase.tipo === 'lanzada' ? (
          <Button type="button" className="h-11 md:h-9" onClick={alImportarOtro}>
            Importar otro archivo
          </Button>
        ) : null}
      </div>
    </div>
  )
}
