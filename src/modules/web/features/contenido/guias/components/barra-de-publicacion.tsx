'use client'

import { useId, useState } from 'react'
import { instanteDeLocal } from '@/shared/lib/fechas'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  MOTIVO_DE_FECHA_PASADA,
  accionesDePublicacion,
  esFechaDeProgramar,
  motivoDePublicacion,
  type EstadoDeGuia,
} from '../../../../entities/contenido/guias'

type Props = {
  // El `id` del <form> que envía «Guardar».
  idFormulario: string
  estado: EstadoDeGuia
  // Tiene `web.guias.publicar` (lo decide la página con `puede()`).
  puedePublicarGuias: boolean
  conCuerpo: boolean
  enLinea: boolean
  enCurso: boolean
  zona: string
  alPublicar: () => void
  alProgramar: (cuando: string) => void
  alDespublicar: () => void
}

const TACTIL = 'min-h-11 md:min-h-9'

// Programar: la fecha y la hora de la empresa; ISO al servidor. Inline bajo la barra (no es un modal: no abre otro nivel).
function Programar({
  zona,
  alProgramar,
  deshabilitado,
}: {
  zona: string
  alProgramar: (cuando: string) => void
  deshabilitado: boolean
}) {
  const id = useId()
  const [local, setLocal] = useState('')
  const [error, setError] = useState<string | null>(null)
  function confirmar() {
    const cuando = instanteDeLocal(local, { zona })
    if (cuando === null || !esFechaDeProgramar(cuando, new Date())) {
      setError(MOTIVO_DE_FECHA_PASADA)
      return
    }
    alProgramar(cuando)
  }
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>Publicar el</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id={id}
          type="datetime-local"
          value={local}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${TACTIL} w-auto`}
          onChange={(evento) => {
            setLocal(evento.target.value)
            setError(null)
          }}
        />
        <Button type="button" className={TACTIL} disabled={deshabilitado} onClick={confirmar}>
          Programar
        </Button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
    </div>
  )
}

type Boton = { etiqueta: string; apagado: boolean; describe: string | undefined }

// Un botón de la barra: de contorno, táctil, con su motivo enlazado.
function BotonDeLaBarra({
  boton,
  alPulsar,
  expandido,
}: {
  boton: Boton
  alPulsar: () => void
  expandido?: boolean
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={TACTIL}
      disabled={boton.apagado}
      aria-describedby={boton.describe}
      aria-expanded={expandido}
      onClick={alPulsar}
    >
      {boton.etiqueta}
    </Button>
  )
}

// Guardar, y según el estado: Publicar y Programar (borrador), Publicar ahora y Despublicar (programada) o Despublicar (publicada). Sin el permiso
// o sin lo que falta, los botones quedan apagados y su motivo, a la vista debajo (no sólo en un `title`).
export function BarraDePublicacion(props: Props) {
  const { estado, enCurso, idFormulario } = props
  const [programando, setProgramando] = useState(false)
  const idMotivo = useId()
  const acciones = accionesDePublicacion(estado)
  const motivo = motivoDePublicacion(estado, {
    permitido: props.puedePublicarGuias,
    conCuerpo: props.conCuerpo,
    enLinea: props.enLinea,
  })
  const describe = motivo ? idMotivo : undefined
  // Publicar y Programar piden permiso, texto y red; Despublicar, sólo el permiso.
  const apagado = enCurso || motivo !== null
  const sinPermiso = !props.puedePublicarGuias || enCurso
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" form={idFormulario} className={TACTIL} disabled={enCurso}>
          {enCurso ? 'Guardando…' : 'Guardar'}
        </Button>
        {acciones.publicar ? (
          <BotonDeLaBarra
            boton={{ etiqueta: acciones.publicar, apagado, describe }}
            alPulsar={props.alPublicar}
          />
        ) : null}
        {acciones.programar ? (
          <BotonDeLaBarra
            boton={{ etiqueta: 'Programar…', apagado, describe }}
            expandido={programando}
            alPulsar={() => {
              setProgramando((antes) => !antes)
            }}
          />
        ) : null}
        {acciones.despublicar ? (
          <BotonDeLaBarra
            boton={{ etiqueta: 'Despublicar', apagado: sinPermiso, describe }}
            alPulsar={props.alDespublicar}
          />
        ) : null}
      </div>
      {motivo ? (
        <p id={idMotivo} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {motivo}
        </p>
      ) : null}
      {programando && acciones.programar && !apagado ? (
        <Programar zona={props.zona} alProgramar={props.alProgramar} deshabilitado={enCurso} />
      ) : null}
    </div>
  )
}
