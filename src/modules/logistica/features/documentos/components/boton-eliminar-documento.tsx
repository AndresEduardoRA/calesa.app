'use client'

import { Button } from '@/shared/ui/button'
import type { DocumentoDeLaUnidad, TipoDeDocumento } from '../../../entities/documentos/documento'
import { quePuedeHacer } from '../../../entities/documentos/revision'
import type { ContextoDeLaFila } from './contexto-de-la-fila'

type Props = {
  documento: DocumentoDeLaUnidad
  tipo: TipoDeDocumento | null
  contexto: ContextoDeLaFila
}

// «Eliminar» en la fila (D20): lo ofrece a quien tiene aprobar o subir y apagado dice por qué; abre el diálogo por la URL.
export function BotonEliminarDocumento({ documento, tipo, contexto }: Props) {
  const puede = quePuedeHacer(documento, tipo, contexto.claves).eliminar
  const motivo = puede.tipo === 'apagada' ? puede.motivo : null
  const idMotivo = `eliminar-${documento.id}-motivo`
  return (
    <div className="grid gap-1">
      <div>
        <Button
          variant="outline"
          className="min-h-11 md:min-h-9"
          aria-label={`Eliminar ${documento.nombre ?? 'documento sin nombre'}`}
          aria-describedby={motivo ? idMotivo : undefined}
          disabled={puede.tipo !== 'habilitada'}
          onClick={() => {
            contexto.alEliminar(documento.id)
          }}
        >
          Eliminar
        </Button>
      </div>
      {motivo ? (
        <p id={idMotivo} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {motivo}
        </p>
      ) : null}
    </div>
  )
}
