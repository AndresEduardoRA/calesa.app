'use client'

import { useId } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Label } from '@/shared/ui/label'
import { Switch } from '@/shared/ui/switch'
import type { DocumentoDeLaUnidad, TipoDeDocumento } from '../../../entities/documentos/documento'
import {
  quePuedeHacer,
  yaNoSeVeEnElPortal,
  YA_NO_SE_VE_EN_EL_PORTAL,
} from '../../../entities/documentos/revision'
import { useEditarElDocumento } from '../hooks/use-editar-el-documento'
import type { ContextoDeLaFila } from './contexto-de-la-fila'

type Props = {
  documento: DocumentoDeLaUnidad
  tipo: TipoDeDocumento | null
  contexto: ContextoDeLaFila
}

function TextoDelInterruptor({
  id,
  conflicto,
  error,
  texto,
}: {
  id: string
  conflicto: string | null
  error: string | null
  texto: string | null
}) {
  if (error || conflicto) {
    return (
      <Aviso tono={error ? 'peligro' : 'aviso'}>
        <p id={id}>{conflicto ?? error}</p>
      </Aviso>
    )
  }
  return texto ? (
    <p id={id} className="text-(length:--text-sm) text-(--color-ink-soft)">
      {texto}
    </p>
  ) : null
}

// «Visible en el portal» de un documento (D23): un interruptor con su etiqueta. Lo enciende quien aprueba y sólo si el tipo lo admite; apagado dice por qué. Apagar siempre se puede.
// Cambiar manda sólo `visible_portal` con la versión de la fila; si la base lo rechaza, el interruptor vuelve a su valor y se dice el motivo tal cual.
export function InterruptorDelPortal({ documento, tipo, contexto }: Props) {
  const id = useId()
  const puede = quePuedeHacer(documento, tipo, contexto.claves).portal
  const { editar, enCurso, error, conflicto } = useEditarElDocumento(contexto.unidadId, documento)
  const motivo = puede.tipo === 'apagada' ? puede.motivo : null
  const avisoDelTipo = yaNoSeVeEnElPortal(documento, tipo) ? YA_NO_SE_VE_EN_EL_PORTAL : null
  const idMotivo = `${id}-motivo`
  const texto = conflicto ?? error ?? motivo ?? avisoDelTipo

  return (
    <div className="grid gap-1" data-portal-del-documento>
      <div className="flex min-h-11 items-center gap-2 md:min-h-8">
        <Switch
          id={id}
          size="sm"
          checked={documento.visiblePortal}
          disabled={puede.tipo !== 'habilitada' || enCurso}
          aria-describedby={texto ? idMotivo : undefined}
          onCheckedChange={(valor) => {
            void editar(
              { visible_portal: valor },
              valor ? 'Ahora se ve en el portal.' : 'Ya no se ve en el portal.',
            )
          }}
        />
        <Label htmlFor={id}>Visible en el portal</Label>
      </div>
      <TextoDelInterruptor id={idMotivo} conflicto={conflicto} error={error} texto={texto} />
    </div>
  )
}
