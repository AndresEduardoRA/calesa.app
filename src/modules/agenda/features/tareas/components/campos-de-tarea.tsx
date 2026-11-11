'use client'

import { useId } from 'react'
import { Campo } from '@/shared/ui/campo'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { LARGO_MAXIMO_DE_DESCRIPCION, LARGO_MAXIMO_DE_TITULO } from '../../../entities/edicion'
import { leerPersonasParaTarea } from '../../../composicion.client'
import { SelectorDePersonas } from '../../personas/components/selector-de-personas'
import type { useFormularioDeTarea } from '../hooks/use-formulario-de-tarea'

type Props = {
  formulario: ReturnType<typeof useFormularioDeTarea>
  // Al crear, con `agenda.tareas.asignar`, se puede elegir a otra persona; sin el permiso (o al editar) no hay selector.
  puedeElegirResponsable: boolean
  creando: boolean
}

// Los campos de una tarea: título, vencimiento, descripción y, al crear con permiso, para quién es. Sin permiso, el texto dice que será suya.
export function CamposDeTarea({ formulario: f, puedeElegirResponsable, creando }: Props) {
  const id = useId()
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <Campo
        nombre="titulo"
        etiqueta="Título"
        value={f.valores.titulo}
        maxLength={LARGO_MAXIMO_DE_TITULO + 20}
        error={f.errores.titulo}
        onChange={(evento) => {
          f.cambiar('titulo', evento.target.value)
        }}
      />
      <Campo
        nombre="vence_en"
        etiqueta="Vence"
        type="datetime-local"
        value={f.valores.venceEn}
        error={f.errores.vence_en}
        onChange={(evento) => {
          f.cambiar('venceEn', evento.target.value)
        }}
      />
      {creando && puedeElegirResponsable ? (
        <SelectorDePersonas
          etiqueta="Para otra persona (opcional)"
          elegidas={f.valores.responsable ? [f.valores.responsable] : []}
          alCambiar={(personas) => {
            f.cambiar('responsable', personas[0] ?? null)
          }}
          leer={leerPersonasParaTarea}
          error={f.errores.responsable_id}
        />
      ) : null}
      {creando && !puedeElegirResponsable ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">Será tu tarea.</p>
      ) : null}
      {creando && puedeElegirResponsable && !f.valores.responsable ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Si no eliges a nadie, será tu tarea.
        </p>
      ) : null}
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-descripcion`}>Descripción (opcional)</Label>
        <Textarea
          id={`${id}-descripcion`}
          value={f.valores.descripcion}
          rows={4}
          maxLength={LARGO_MAXIMO_DE_DESCRIPCION + 20}
          aria-invalid={f.errores.descripcion ? true : undefined}
          onChange={(evento) => {
            f.cambiar('descripcion', evento.target.value)
          }}
        />
        {f.errores.descripcion ? (
          <p className="text-(length:--text-sm) text-(--color-peligro-ink)">
            {f.errores.descripcion}
          </p>
        ) : null}
      </div>
    </div>
  )
}
