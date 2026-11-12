'use client'

import { SendIcon } from 'lucide-react'
import { useState, type RefObject } from 'react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import type { CitaDeMensaje, TextoValido } from '../../../entities/mensajes'
import { CitaSobreElRedactor } from './cita-de-respuesta'

type Props = {
  alEnviar: (texto: string) => TextoValido
  // El campo es de quien lo monta: para llevarle el foco al responder.
  campo: RefObject<HTMLTextAreaElement | null>
  respondiendoA: CitaDeMensaje | null
  alQuitarRespuesta: () => void
}

// Donde se escribe: Enter envía, Mayús+Enter salta de línea (y no envía mientras se compone con un teclado de IME). Después de enviar se limpia y
// el foco se queda. Pasado el largo máximo dice el motivo y no envía. Sin borrador persistente.
export function Redactor({ alEnviar, campo, respondiendoA, alQuitarRespuesta }: Props) {
  const [texto, setTexto] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)

  function enviar() {
    const valido = alEnviar(texto)
    if (valido.ok) {
      setTexto('')
      setAviso(null)
    } else if (valido.motivo === 'largo') {
      setAviso(valido.mensaje ?? null)
    }
    campo.current?.focus()
  }

  return (
    <form
      className="grid gap-1 border-t border-(--color-line) p-3"
      onSubmit={(evento) => {
        evento.preventDefault()
        enviar()
      }}
    >
      {respondiendoA ? (
        <CitaSobreElRedactor
          cita={respondiendoA}
          alQuitar={() => {
            alQuitarRespuesta()
            campo.current?.focus()
          }}
        />
      ) : null}
      <div className="flex items-end gap-2">
        <Textarea
          ref={campo}
          aria-label="Mensaje"
          placeholder="Escribe un mensaje"
          rows={1}
          value={texto}
          aria-invalid={aviso ? true : undefined}
          className="max-h-40 min-h-11 resize-none"
          onChange={(evento) => {
            setTexto(evento.target.value)
            setAviso(null)
          }}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter' && !evento.shiftKey && !evento.nativeEvent.isComposing) {
              evento.preventDefault()
              enviar()
            }
          }}
        />
        <Button
          type="submit"
          aria-label="Enviar mensaje"
          className="min-h-11 min-w-11 md:min-h-9 md:min-w-9"
          disabled={texto.trim() === ''}
        >
          <SendIcon aria-hidden className="size-4" />
        </Button>
      </div>
      {aviso ? (
        <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {aviso}
        </p>
      ) : null}
    </form>
  )
}
