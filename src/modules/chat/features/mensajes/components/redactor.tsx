'use client'

import { SendIcon } from 'lucide-react'
import type { RefObject } from 'react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import type { Referencia } from '../../../entities/menciones'
import type { CitaDeMensaje, TextoValido } from '../../../entities/mensajes'
import { SelectorDeMencionesDiferido } from '../../menciones/components/diferidos'
import { useRedactor } from '../hooks/use-redactor'
import { CitaSobreElRedactor } from './cita-de-respuesta'

type Props = {
  // Recibe el cuerpo ya con los tokens de las menciones y esas menciones; el largo se mide con los tokens (D5).
  alEnviar: (cuerpo: string, menciones: readonly Referencia[]) => TextoValido
  usuarioId: string
  // El campo es de quien lo monta: para llevarle el foco al responder.
  campo: RefObject<HTMLTextAreaElement | null>
  respondiendoA: CitaDeMensaje | null
  alQuitarRespuesta: () => void
}

// Donde se escribe: Enter envía, Mayús+Enter salta de línea (y no envía mientras se compone con un teclado de IME). Después de enviar se limpia y
// el foco se queda. Pasado el largo máximo dice el motivo y no envía. Un `#` abre el selector de menciones (7.10-2). Sin borrador persistente.
export function Redactor({ alEnviar, usuarioId, campo, respondiendoA, alQuitarRespuesta }: Props) {
  const { texto, aviso, menciones, selectorMontado, alCambiar, alSeleccionar, alTeclear, enviar } =
    useRedactor({
      alEnviar,
      campo,
    })

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
      {selectorMontado ? (
        <SelectorDeMencionesDiferido
          consulta={menciones.consulta}
          yo={usuarioId}
          id={menciones.idDelSelector}
          idDeOpcion={menciones.idDeOpcion}
          activa={menciones.activa}
          alElegir={menciones.elegir}
          alCambiarOpciones={menciones.informarOpciones}
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
          aria-controls={menciones.abierto ? menciones.idDelSelector : undefined}
          aria-activedescendant={
            menciones.abierto && menciones.hayOpciones
              ? menciones.idDeOpcion(menciones.activa)
              : undefined
          }
          className="max-h-40 min-h-11 resize-none"
          onChange={(evento) => {
            alCambiar(evento.target.value, evento.target.selectionStart)
          }}
          onSelect={(evento) => {
            alSeleccionar(evento.currentTarget.selectionStart)
          }}
          onKeyDown={alTeclear}
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
