'use client'

import { formatearNumero } from '@/shared/lib/formato'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import type { ArchivoEnMemoria } from '../../../entities/informe-de-importacion'
import type { Importaciones } from '../hooks/use-importaciones'
import type { LanzarImportacion } from '../hooks/use-lanzar-importacion'
import { ResumenDeLaImportacion } from './resumen-de-la-importacion'

type Props = {
  lanzar: LanzarImportacion
  importaciones: Importaciones
  archivo: ArchivoEnMemoria | null
  alVolverALaPrevia: () => void
  alImportarOtro: () => void
}

// El cuarto paso: preparar el archivo, subirlo y crear la importación. Desde acá la función la procesa sola: se puede salir de la pantalla.
// Lanzada, muestra el avance leído de la base y el resultado (9.06-5); «Importar otro archivo» se ofrece en seguida (D58).
export function PasoImportando(props: Props) {
  const { lanzar, importaciones, archivo, alVolverALaPrevia, alImportarOtro } = props
  const { locale } = useRegional()
  const { fase } = lanzar
  const numero = (n: number) => formatearNumero(n, { locale })
  return (
    <div className="grid gap-4">
      {fase.tipo === 'lanzada' ? (
        <ResumenDeLaImportacion
          resumen={importaciones.resumenDe(fase.id)}
          ahora={importaciones.ahora}
          avisoDelSondeo={importaciones.avisoDelSondeo}
          archivo={archivo}
        />
      ) : (
        <p aria-live="polite" className="text-(length:--text-sm)">
          {fase.tipo === 'preparando'
            ? `Preparando el archivo… ${numero(fase.hechas)} de ${numero(fase.total)} filas.`
            : fase.tipo === 'subiendo'
              ? 'Subiendo el archivo…'
              : ''}
        </p>
      )}
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
