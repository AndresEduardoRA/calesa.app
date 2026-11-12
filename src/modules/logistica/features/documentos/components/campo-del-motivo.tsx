'use client'

import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import {
  FALTA_EL_MOTIVO,
  MOTIVO_MAXIMO,
  motivoDeRechazoValido,
} from '../../../entities/documentos/revision'

type Props = {
  documentoId: string
  motivo: string
  alEscribir: (motivo: string) => void
  alConfirmar: () => void
  alCancelar: () => void
  enCurso: boolean
}

// El motivo de un rechazo, escrito junto al botón (D22): de 1 a 500 caracteres. Vacío, «Confirmar rechazo» está apagado y dice por qué.
export function CampoDelMotivo({
  documentoId,
  motivo,
  alEscribir,
  alConfirmar,
  alCancelar,
  enCurso,
}: Props) {
  const valido = motivoDeRechazoValido(motivo) !== null
  const idAyuda = `motivo-${documentoId}-falta`
  return (
    <div className="grid gap-2" data-campo="motivo-del-rechazo">
      <Campo
        nombre={`motivo-${documentoId}`}
        etiqueta="Motivo del rechazo"
        autoComplete="off"
        maxLength={MOTIVO_MAXIMO}
        value={motivo}
        onChange={(evento) => {
          alEscribir(evento.target.value)
        }}
        disabled={enCurso}
      />
      {!valido ? (
        <p id={idAyuda} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {FALTA_EL_MOTIVO}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="destructive"
          className="min-h-11 md:min-h-9"
          disabled={!valido || enCurso}
          aria-describedby={!valido ? idAyuda : undefined}
          onClick={alConfirmar}
        >
          Confirmar rechazo
        </Button>
        <Button
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={enCurso}
          onClick={alCancelar}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
