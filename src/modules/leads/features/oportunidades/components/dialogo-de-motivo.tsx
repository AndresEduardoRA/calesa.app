'use client'

import { useId, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { LARGO_MAXIMO_DE_MOTIVO, validarMotivo } from '../../../entities/oportunidad'

type Props = {
  abierto: boolean
  // La etapa perdida a la que va: «Mover a «Perdido»».
  etapa: string
  titulo: string
  enCurso: boolean
  alCerrar: () => void
  alConfirmar: (motivo: string | null) => void
}

// Mover a una etapa perdida pregunta el motivo (opcional, hasta 200). No es una confirmación:
// se puede mover sin escribir nada.
export function DialogoDeMotivo({ abierto, etapa, titulo, enCurso, alCerrar, alConfirmar }: Props) {
  const id = useId()
  const [motivo, setMotivo] = useState('')
  const error = validarMotivo(motivo)
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Mover a «${etapa}»`}
      descripcion={`«${titulo}» queda perdida. Si quieres, anota por qué.`}
      pie={
        <>
          <Button variant="ghost" onClick={alCerrar} disabled={enCurso}>
            Cancelar
          </Button>
          <Button
            disabled={enCurso || error !== null}
            onClick={() => {
              alConfirmar(motivo.trim() === '' ? null : motivo.trim())
            }}
          >
            Mover
          </Button>
        </>
      }
    >
      <div className="grid gap-1.5">
        <Label htmlFor={id}>Motivo (opcional)</Label>
        <Textarea
          id={id}
          value={motivo}
          rows={3}
          maxLength={LARGO_MAXIMO_DE_MOTIVO + 20}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-ayuda`}
          onChange={(evento) => {
            setMotivo(evento.target.value)
          }}
        />
        <p
          id={`${id}-ayuda`}
          className={`text-(length:--text-xs) ${error ? 'text-(--color-peligro-ink)' : 'text-(--color-ink-soft)'}`}
        >
          {error ?? `${String(motivo.trim().length)} de ${String(LARGO_MAXIMO_DE_MOTIVO)}`}
        </p>
      </div>
    </Modal>
  )
}
