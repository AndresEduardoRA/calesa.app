'use client'

import { useId, useRef } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import { MENSAJE_YA_NO_ESTA } from '../../../entities/comentarios/borrado'
import { useEnvioDelCampo } from '../hooks/use-envio-del-campo'

type Props = {
  // Lo que se lee por el campo: «Escribe un comentario», «Escribe una respuesta», «Edita tu comentario».
  etiqueta: string
  texto: string
  alCambiar: (texto: string) => void
  etiquetaEnviar: string
  // Lo que hace enviar; devuelve el error que dice la base (o nulo si entró).
  alEnviar: (texto: string) => Promise<ErrorApp | null>
  alCancelar?: () => void
  alRecargar: () => void
  autoFoco?: boolean
  deshabilitado?: boolean
}

// El motivo bajo el campo; un conflicto o un comentario que ya no está ofrecen «Recargar».
function ErrorDelCampo(props: { id: string; error: ErrorApp; alRecargar: () => void }) {
  const { id, error, alRecargar } = props
  const ofreceRecargar = error.codigo === 'conflicto' || error.mensaje === MENSAJE_YA_NO_ESTA
  return (
    <div id={id} role="alert" className="flex flex-wrap items-center gap-2">
      <p className="text-(length:--text-sm) text-(--color-peligro-ink)">{error.mensaje}</p>
      {ofreceRecargar ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 md:min-h-7"
          onClick={alRecargar}
        >
          Recargar
        </Button>
      ) : null}
    </div>
  )
}

// Un campo para comentar, responder o editar (4.27-2). Si la base lo rechaza, lo escrito queda y el motivo va bajo el campo (`aria-describedby`).
export function CampoDeComentario(props: Props) {
  const { etiqueta, texto, alCambiar, etiquetaEnviar, alCancelar, alRecargar } = props
  const id = useId()
  const campo = useRef<HTMLTextAreaElement>(null)
  const envio = useEnvioDelCampo({
    campo,
    texto,
    alEnviar: props.alEnviar,
    alCancelar,
    deshabilitado: props.deshabilitado ?? false,
  })
  const idDelError = `${id}-error`
  return (
    <form className="grid min-w-0 gap-2" onSubmit={envio.alEnviarElFormulario}>
      <label htmlFor={id} className="sr-only">
        {etiqueta}
      </label>
      <Textarea
        id={id}
        ref={campo}
        value={texto}
        placeholder={etiqueta}
        // Abrir «Responder» o «Editar» lleva el foco a su campo.
        autoFocus={props.autoFoco ?? false}
        disabled={envio.apagado}
        aria-invalid={envio.error !== null}
        aria-describedby={envio.error ? idDelError : undefined}
        onChange={(evento) => {
          alCambiar(evento.target.value)
        }}
        onKeyDown={envio.alTeclear}
      />
      {envio.error ? (
        <ErrorDelCampo
          id={idDelError}
          error={envio.error}
          alRecargar={() => {
            envio.limpiarError()
            alRecargar()
          }}
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="min-h-11 md:min-h-9" disabled={envio.apagado}>
          {etiquetaEnviar}
        </Button>
        {alCancelar ? (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 md:min-h-9"
            disabled={envio.enviando}
            onClick={alCancelar}
          >
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  )
}
