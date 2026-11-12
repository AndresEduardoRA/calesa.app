'use client'

import { SelectorDePersonas, TOPE_DE_DESTINATARIOS } from '@/modules/agenda/client'
import type { PersonasEncontradas } from '@/modules/agenda/client'
import type { Resultado } from '@/shared/lib/errores'
import { Campo } from '@/shared/ui/campo'
import type { useFormularioDeEvento } from '../hooks/use-formulario-de-evento'

type Props = {
  formulario: ReturnType<typeof useFormularioDeEvento>
  leer: (texto: string) => Promise<Resultado<PersonasEncontradas>>
}

// Los campos de «Nuevo evento»: título, cuándo empieza e invitados (sin `agenda.eventos.publicar`, el texto dice que será privado).
export function CamposDeEvento({ formulario: f, leer }: Props) {
  return (
    <>
      <Campo
        nombre="titulo-de-evento"
        etiqueta="Título"
        value={f.valores.titulo}
        error={f.errores.titulo}
        onChange={(evento) => {
          f.cambiar('titulo', evento.target.value)
        }}
      />
      <Campo
        nombre="inicia-de-evento"
        etiqueta="Empieza"
        type="datetime-local"
        value={f.valores.iniciaEn}
        error={f.errores.inicia_en}
        onChange={(evento) => {
          f.cambiar('iniciaEn', evento.target.value)
        }}
      />
      {f.puedePublicar ? (
        <SelectorDePersonas
          etiqueta="Invitados"
          multiple
          maximo={TOPE_DE_DESTINATARIOS}
          elegidas={f.valores.destinatarios}
          alCambiar={(personas) => {
            f.cambiar('destinatarios', personas)
          }}
          leer={leer}
          error={f.errores.destinatarios}
        />
      ) : (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Será un evento privado: sólo lo verás tú.
        </p>
      )}
    </>
  )
}
