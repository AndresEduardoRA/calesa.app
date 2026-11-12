'use client'

import { useState } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Button } from '@/shared/ui/button'
import type { DocumentoDeLaUnidad, TipoDeDocumento } from '../../../entities/documentos/documento'
import {
  motivoDeRechazoValido,
  quePuedeHacer,
  type Accion,
} from '../../../entities/documentos/revision'
import { useRevisarElDocumento } from '../hooks/use-revisar-el-documento'
import { CampoDelMotivo } from './campo-del-motivo'
import type { ContextoDeLaFila } from './contexto-de-la-fila'

type Props = {
  documento: DocumentoDeLaUnidad
  tipo: TipoDeDocumento | null
  contexto: ContextoDeLaFila
}

const sePuede = (accion: Accion, enCurso: boolean) => accion.tipo === 'habilitada' && !enCurso

// El texto que explica por qué un botón está apagado (uno solo: aprobar y rechazar piden lo mismo).
function motivoApagado(acciones: readonly Accion[]): string | null {
  for (const accion of acciones) {
    if (accion.tipo === 'apagada' && accion.motivo !== null) return accion.motivo
  }
  return null
}

function AvisosDeLaRevision({
  conflicto,
  error,
  releer,
}: {
  conflicto: string | null
  error: string | null
  releer: () => void
}) {
  return (
    <>
      {conflicto ? (
        <AvisoDeConflicto
          mensaje={conflicto}
          alRecargar={releer}
          detalle="No se cambió nada. Recargar trae la versión nueva y conserva tu motivo."
        />
      ) : null}
      {error ? (
        <Aviso tono="peligro">
          <p>{error}</p>
        </Aviso>
      ) : null}
    </>
  )
}

// «Aprobar» y «Rechazar» en la fila de un documento (6.06-3). Sin la clave de aprobar quedan apagados y dicen por qué; no se esconden. Rechazar pide el motivo en un campo junto al
// botón. Si otra persona cambió la fila (`PT409`) se dice aquí, con el motivo todavía escrito.
export function AccionesDelDocumento({ documento, tipo, contexto }: Props) {
  const puede = quePuedeHacer(documento, tipo, contexto.claves)
  const { revisar, enCurso, error, conflicto } = useRevisarElDocumento(contexto.unidadId, documento)
  const [motivo, setMotivo] = useState<string | null>(null)
  const idMotivo = `revisar-${documento.id}-motivo`
  const porQue = motivoApagado([puede.aprobar, puede.rechazar])
  const describe = porQue ? idMotivo : undefined
  const hayBotones = puede.aprobar.tipo !== 'oculta' || puede.rechazar.tipo !== 'oculta'
  if (!hayBotones && !error && !conflicto) return null

  function confirmarRechazo() {
    const valido = motivoDeRechazoValido(motivo ?? '')
    if (valido === null) return
    void revisar('rechazado', valido).then((quedo) => {
      if (quedo) setMotivo(null)
    })
  }

  return (
    <div className="grid gap-2" data-acciones-de-revision>
      <div className="flex flex-wrap gap-2">
        {puede.aprobar.tipo !== 'oculta' ? (
          <Button
            className="min-h-11 md:min-h-9"
            disabled={!sePuede(puede.aprobar, enCurso)}
            aria-describedby={describe}
            onClick={() => void revisar('aprobado', null)}
          >
            Aprobar
          </Button>
        ) : null}
        {puede.rechazar.tipo !== 'oculta' && motivo === null ? (
          <Button
            variant="outline"
            className="min-h-11 md:min-h-9"
            disabled={!sePuede(puede.rechazar, enCurso)}
            aria-describedby={describe}
            onClick={() => {
              setMotivo('')
            }}
          >
            Rechazar
          </Button>
        ) : null}
      </div>
      {porQue ? (
        <p id={idMotivo} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {porQue}
        </p>
      ) : null}
      {motivo !== null && puede.rechazar.tipo === 'habilitada' ? (
        <CampoDelMotivo
          documentoId={documento.id}
          motivo={motivo}
          alEscribir={setMotivo}
          alCancelar={() => {
            setMotivo(null)
          }}
          alConfirmar={confirmarRechazo}
          enCurso={enCurso}
        />
      ) : null}
      <AvisosDeLaRevision conflicto={conflicto} error={error} releer={contexto.releer} />
    </div>
  )
}
