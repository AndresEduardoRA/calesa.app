'use client'

import { useId } from 'react'
import { Label } from '@/shared/ui/label'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { Textarea } from '@/shared/ui/textarea'
import { LARGO_MAXIMO_DE_MOTIVO } from '../../../entities/oportunidad'
import { useFormularioDeMovida } from '../hooks/use-formulario-de-movida'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // La etapa perdida a la que va y lo que se mueve: «Mover a «Perdido»».
  etapa: string
  titulo: string
  // Mueve la oportunidad; `true` si se movió.
  alMover: (motivo: string | null) => Promise<boolean>
  // Con el modal abierto, la oportunidad dejó de estar: por qué ya no se mueve.
  noDisponible: string | null
  // A dónde vuelve el foco al cerrar: el botón «Mover a…» de esa oportunidad.
  focoAlCerrar: () => HTMLElement | boolean
}

// Mover a una etapa perdida pregunta el motivo (opcional, hasta 200): `?panel=mover-oportunidad&oportunidad=&destino=`. No es
// una confirmación: se puede mover sin escribir nada. El contrato del modal (no cerrarse mientras mueve, preguntar antes de
// descartar un motivo escrito, Esc, «atrás», recarga y sin conexión) es de `ModalDeFormulario`. Quien lo monta le da una `key`
// por apertura: cada una empieza con el motivo vacío.
export function ModalDeMovida({
  abierto,
  alCerrar,
  etapa,
  titulo,
  alMover,
  noDisponible,
  focoAlCerrar,
}: Props) {
  const id = useId()
  const formulario = useFormularioDeMovida({ alMover, alCerrar })
  return (
    <ModalDeFormulario
      id={`mover-oportunidad-${id}`}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Mover a «${etapa}»`}
      descripcion={`«${titulo}» queda perdida. Si quieres, anota por qué.`}
      focoInicial={() => document.getElementById(id)}
      focoAlCerrar={focoAlCerrar}
      formulario={formulario}
      noDisponible={noDisponible}
      guardar={{ etiqueta: 'Mover', enCurso: 'Moviendo…' }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor={id}>Motivo (opcional)</Label>
        <Textarea
          id={id}
          name="motivo"
          value={formulario.motivo}
          rows={3}
          maxLength={LARGO_MAXIMO_DE_MOTIVO + 20}
          aria-invalid={formulario.error ? true : undefined}
          aria-describedby={`${id}-ayuda`}
          onChange={(evento) => {
            formulario.escribir(evento.target.value)
          }}
        />
        <p
          id={`${id}-ayuda`}
          className={`text-(length:--text-xs) ${formulario.error ? 'text-(--color-peligro-ink)' : 'text-(--color-ink-soft)'}`}
        >
          {formulario.error ??
            `${String(formulario.motivo.trim().length)} de ${String(LARGO_MAXIMO_DE_MOTIVO)}`}
        </p>
      </div>
    </ModalDeFormulario>
  )
}
