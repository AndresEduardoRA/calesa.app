'use client'

import { SelectorDePersonas } from '@/modules/agenda/client'
import type { PersonasEncontradas } from '@/modules/agenda/client'
import type { Resultado } from '@/shared/lib/errores'
import { Campo } from '@/shared/ui/campo'
import type { useFormularioDeTarea } from '../hooks/use-formulario-de-tarea'

type Props = {
  formulario: ReturnType<typeof useFormularioDeTarea>
  leer: (texto: string) => Promise<Resultado<PersonasEncontradas>>
}

// Los campos de «Nueva tarea»: título, vencimiento y responsable (sin el permiso, el texto dice que será tuya).
export function CamposDeTarea({ formulario: f, leer }: Props) {
  return (
    <>
      <Campo
        nombre="titulo-de-tarea"
        etiqueta="Título"
        value={f.valores.titulo}
        error={f.errores.titulo}
        onChange={(evento) => {
          f.cambiar('titulo', evento.target.value)
        }}
      />
      <Campo
        nombre="vence-de-tarea"
        etiqueta="Vence (opcional)"
        type="datetime-local"
        value={f.valores.venceEn}
        error={f.errores.vence_en}
        onChange={(evento) => {
          f.cambiar('venceEn', evento.target.value)
        }}
      />
      {f.puedeAsignar ? (
        <SelectorDePersonas
          etiqueta="Responsable"
          elegidas={f.valores.responsable ? [f.valores.responsable] : []}
          alCambiar={(personas) => {
            f.cambiar('responsable', personas[0] ?? null)
          }}
          leer={leer}
          error={f.errores.responsable_id}
        />
      ) : (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">Será tu tarea.</p>
      )}
    </>
  )
}
