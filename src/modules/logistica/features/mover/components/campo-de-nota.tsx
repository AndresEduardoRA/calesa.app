'use client'

import { useId, useState } from 'react'
import { atajoDe } from '@/shared/lib/atajos'
import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { esquemaDelCuerpoDeLaNota, restantesDeLaNota } from '../../../entities/mover/notas'

type Props = {
  etiqueta: string
  textoDelBoton: string
  inicial?: string
  // Devuelve el motivo si no se pudo guardar; el texto escrito se conserva.
  alGuardar: (cuerpo: string) => Promise<ErrorApp | null>
  // Con «Cancelar» el campo es una edición en el lugar; sin él, es el de una nota nueva y se vacía al guardar.
  alCancelar?: () => void
  autoFoco?: boolean
}

function Restantes({ texto }: { texto: string }) {
  const restantes = restantesDeLaNota(texto)
  return (
    <p className="text-(length:--text-xs) text-(--color-ink-soft)">
      {restantes < 0
        ? `Sobran ${String(-restantes)} caracteres.`
        : `Quedan ${String(restantes)} caracteres.`}
    </p>
  )
}

// El campo para escribir o corregir una nota (6.04-2): su etiqueta, lo que queda de 2000 caracteres y «Guardar». Ctrl/Cmd+Enter guarda. Apagado mientras guarda y mientras no hay nada que
// guardar: nunca doble envío. Si falla, el motivo va junto al botón y el texto queda.
export function CampoDeNota({
  etiqueta,
  textoDelBoton,
  inicial = '',
  alGuardar,
  alCancelar,
  autoFoco = false,
}: Props) {
  const id = useId()
  const [texto, setTexto] = useState(inicial)
  const [enCurso, setEnCurso] = useState(false)
  const [error, setError] = useState<ErrorApp | null>(null)
  const valida = esquemaDelCuerpoDeLaNota.safeParse(texto).success

  async function guardar() {
    if (!valida || enCurso) return
    setEnCurso(true)
    setError(null)
    const rechazo = await alGuardar(texto.trim())
    setEnCurso(false)
    if (rechazo) {
      setError(rechazo)
    } else if (alCancelar) {
      alCancelar()
    } else {
      setTexto('')
    }
  }

  return (
    <form
      className="grid gap-2"
      aria-busy={enCurso}
      onSubmit={(evento) => {
        evento.preventDefault()
        void guardar()
      }}
    >
      <Label htmlFor={id}>{etiqueta}</Label>
      <Textarea
        id={id}
        name="nota"
        value={texto}
        autoFocus={autoFoco}
        aria-invalid={restantesDeLaNota(texto) < 0}
        onChange={(evento) => {
          setTexto(evento.target.value)
        }}
        onKeyDown={(evento) => {
          if (atajoDe(evento.nativeEvent) === 'guardarYSeguir') {
            evento.preventDefault()
            void guardar()
          }
        }}
      />
      <Restantes texto={texto} />
      {error ? (
        <Aviso tono="peligro">
          <p>{error.mensaje}</p>
        </Aviso>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" className="min-h-11 md:min-h-9" disabled={!valida || enCurso}>
          {textoDelBoton}
        </Button>
        {alCancelar ? (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 md:min-h-9"
            disabled={enCurso}
            onClick={alCancelar}
          >
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  )
}
