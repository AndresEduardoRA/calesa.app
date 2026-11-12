'use client'

import { useRef, useState } from 'react'
import { formatearFechaHora } from '@/shared/lib/fechas'
import type { ErrorApp } from '@/shared/lib/errores'
import { Button } from '@/shared/ui/button'
import {
  quePuedeHacerConLaNota,
  textoDelOrigenDeLaNota,
  type NotaDeLaUnidad,
} from '../../../entities/mover/notas'
import { CampoDeNota } from './campo-de-nota'

type Props = {
  nota: NotaDeLaUnidad
  zona: string
  editar: (id: string, cuerpo: string) => Promise<ErrorApp | null>
}

// Una nota de la lista (6.04-2): quién, cuándo, de dónde nació si fue un cambio de fase, y su texto tal cual (nunca HTML). «Editar» sólo en la propia y sin cambio de fase (D22); la
// edición es en el lugar y, al cerrar, el foco vuelve a su botón «Editar».
export function NotaDeLaUnidad({ nota, zona, editar }: Props) {
  const [editando, setEditando] = useState(false)
  const botonEditar = useRef<HTMLButtonElement>(null)
  const origen = textoDelOrigenDeLaNota(nota)

  function cerrar() {
    setEditando(false)
    requestAnimationFrame(() => botonEditar.current?.focus())
  }

  return (
    <li
      className="grid min-w-0 gap-1.5 rounded-lg border border-(--color-line) p-3"
      data-nota={nota.id}
    >
      <p className="flex flex-wrap items-baseline gap-x-2 text-(length:--text-sm) text-(--color-ink-soft)">
        <span className="font-medium text-(--color-ink)">{nota.autor ?? 'Alguien'}</span>
        <time dateTime={nota.creadoEn}>{formatearFechaHora(nota.creadoEn, { zona })}</time>
        {origen ? <span>· {origen}</span> : null}
      </p>
      {editando ? (
        <CampoDeNota
          etiqueta="Corregir la nota"
          textoDelBoton="Guardar"
          inicial={nota.cuerpo}
          autoFoco
          alGuardar={(cuerpo) => editar(nota.id, cuerpo)}
          alCancelar={cerrar}
        />
      ) : (
        <p className="break-words whitespace-pre-wrap">{nota.cuerpo}</p>
      )}
      {quePuedeHacerConLaNota(nota).editar && !editando ? (
        <div>
          <Button
            ref={botonEditar}
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 md:min-h-7"
            onClick={() => {
              setEditando(true)
            }}
          >
            Editar
          </Button>
        </div>
      ) : null}
    </li>
  )
}
