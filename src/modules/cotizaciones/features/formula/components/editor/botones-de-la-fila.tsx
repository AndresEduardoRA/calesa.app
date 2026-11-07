'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/shared/ui/button'

type Props = {
  etiqueta: string
  // La fila tiene texto que editar y no está abierta.
  puedeEditar: boolean
  // Otra cosa abierta: «Editar» espera.
  bloqueada: boolean
  // Hay algo abierto: «Sumar fila» espera.
  sumarBloqueado: boolean
  // La fila acaba de crearse: el foco va a su «Editar».
  enfocar: boolean
  alEditar: () => void
  alSumar: () => void
}

const ESPERA = 'Aplica o cancela la fila abierta.'

// «Editar» y «Sumar fila» de una fila (4.21-3a-1 y 4.21-3a-2), a la derecha de su cabecera.
export function BotonesDeLaFila(props: Props) {
  const { etiqueta, puedeEditar, bloqueada, sumarBloqueado, enfocar, alEditar, alSumar } = props
  const botonEditar = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (enfocar) botonEditar.current?.focus()
  }, [enfocar])
  return (
    <div className="ml-auto flex flex-wrap gap-2">
      {puedeEditar ? (
        <Button
          ref={botonEditar}
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          aria-label={`Editar ${etiqueta}`}
          disabled={bloqueada}
          title={bloqueada ? ESPERA : undefined}
          onClick={alEditar}
        >
          Editar
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-9"
        aria-label={`Sumar fila debajo de ${etiqueta}`}
        disabled={sumarBloqueado}
        title={sumarBloqueado ? ESPERA : undefined}
        onClick={alSumar}
      >
        Sumar fila
      </Button>
    </div>
  )
}
