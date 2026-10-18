'use client'

import { HeartIcon, LinkIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { avisarError } from '@/shared/ui/toasts'
import {
  AVISO_DE_VINCULO,
  TOPE_DE_NOTA,
  rotuloDeVehiculo,
  validarNota,
  vinculoPosible,
  type CandidatoDeVinculo,
} from '../../../entities/vehiculos-del-lead'
import type { AccionesDeVinculo } from '../hooks/use-vinculo'

type Props = {
  candidato: CandidatoDeVinculo
  acciones: AccionesDeVinculo
  // Lo que salió bien cierra el panel.
  alTerminar: () => void
}

type PropsDelInteres = Props & {
  // La nota vive en el panel: cambiar de vehículo no la pierde y el panel sabe si hay una sin mandar.
  nota: string
  alEscribirNota: (nota: string) => void
}

// Vincularlo (o pasarlo a este lead, nombrando a quien lo pierde); si no se puede, el motivo.
function Vincular({ candidato, acciones, alTerminar }: Props) {
  const posible = vinculoPosible(candidato)
  if (posible.tipo === 'no') {
    return <p className="text-(length:--text-sm) text-(--color-ink-soft)">{posible.motivo}</p>
  }
  async function vincular() {
    const envio = await acciones.vincular(
      candidato,
      posible.tipo === 'reemplazar' ? posible.anterior : undefined,
    )
    if (envio.ok) {
      alTerminar()
    } else {
      avisarError(envio.error)
    }
  }
  return (
    <div className="grid gap-2">
      {posible.tipo === 'reemplazar' ? (
        <Aviso tono="aviso">Va a dejar de estar vinculado a {posible.anterior}.</Aviso>
      ) : null}
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">{AVISO_DE_VINCULO}</p>
      <Button
        className="h-11 w-fit md:h-9"
        disabled={acciones.enCurso}
        onClick={() => void vincular()}
      >
        <LinkIcon aria-hidden />
        {posible.tipo === 'reemplazar' ? 'Vincular a este lead' : 'Vincular'}
      </Button>
    </div>
  )
}

// Marcar el interés con una nota (hasta 500), o cambiarle la nota si ya estaba marcado.
function Interes({ candidato, acciones, alTerminar, nota, alEscribirNota }: PropsDelInteres) {
  const idNota = useId()
  const [errorDeNota, setErrorDeNota] = useState<string | null>(null)
  async function marcar() {
    const validada = validarNota(nota)
    if (!validada.ok) {
      setErrorDeNota(validada.motivo)
      return
    }
    const envio = await acciones.marcar(candidato, validada.nota)
    if (envio.ok) {
      alTerminar()
    } else if ('porCampo' in envio && envio.porCampo?.['nota']) {
      setErrorDeNota(envio.porCampo['nota'])
    } else {
      avisarError(envio.error)
    }
  }
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={idNota}>Nota del interés (opcional)</Label>
      <Textarea
        id={idNota}
        value={nota}
        maxLength={TOPE_DE_NOTA + 50}
        aria-invalid={errorDeNota ? true : undefined}
        aria-describedby={`${idNota}-cuenta`}
        onChange={(evento) => {
          alEscribirNota(evento.target.value)
          setErrorDeNota(null)
        }}
      />
      <p
        id={`${idNota}-cuenta`}
        className="text-(length:--text-xs) text-(--color-ink-faint) tabular-nums"
      >
        {nota.trim().length} de {TOPE_DE_NOTA}
      </p>
      {errorDeNota ? (
        <p className="text-(length:--text-sm) text-(--color-peligro-ink)">{errorDeNota}</p>
      ) : null}
      <Button
        variant="outline"
        className="h-11 w-fit md:h-9"
        disabled={acciones.enCurso}
        onClick={() => void marcar()}
      >
        <HeartIcon aria-hidden />
        {candidato.interesado ? 'Guardar la nota' : 'Marcar interés'}
      </Button>
    </div>
  )
}

// Lo que se hace con el vehículo elegido: vincularlo, o marcar el interés con una nota.
export function AccionesDelCandidato(props: PropsDelInteres) {
  const { nota: _nota, alEscribirNota: _alEscribirNota, ...paraVincular } = props
  return (
    <div className="grid gap-4 border-t border-(--color-line) pt-4">
      <p className="font-medium break-words">{rotuloDeVehiculo(props.candidato)}</p>
      <Vincular {...paraVincular} />
      <Interes {...props} />
    </div>
  )
}
