'use client'

import { PlusIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import type { OpcionDeCampo } from '../../../entities/campo'
import { claveDeNombre } from '../../../entities/nombre'

type Props = {
  opciones: readonly OpcionDeCampo[]
  alCambiar: (opciones: OpcionDeCampo[]) => void
  error?: string | undefined
  deshabilitado: boolean
}

// La clave de una opción nueva sale de su nombre y no cambia: los vehículos guardan esa clave.
function claveNueva(etiqueta: string, existentes: readonly OpcionDeCampo[]): string {
  const base = claveDeNombre(etiqueta, 30)
  const usadas = new Set(existentes.map((opcion) => opcion.clave))
  let candidata = base
  for (let n = 2; usadas.has(candidata); n += 1) {
    candidata = `${base}_${n}`
  }
  return candidata
}

// Las opciones de un campo de «una opción» o «varias opciones». Cambiar el nombre de una no toca
// su clave; sacar una la quita de la lista pero no de los vehículos que ya la tienen.
export function EditorDeOpciones({ opciones, alCambiar, error, deshabilitado }: Props) {
  const [nueva, setNueva] = useState('')

  function agregar() {
    const etiqueta = nueva.trim()
    if (etiqueta === '') {
      return
    }
    alCambiar([...opciones, { clave: claveNueva(etiqueta, opciones), etiqueta }])
    setNueva('')
  }

  return (
    <fieldset className="grid gap-2" disabled={deshabilitado}>
      <legend className="mb-1 text-(length:--text-sm) font-medium text-(--color-ink)">
        Opciones
      </legend>
      <ul className="grid gap-2">
        {opciones.map((opcion, indice) => (
          <li key={opcion.clave} className="flex items-center gap-2">
            <Input
              aria-label={`Nombre de la opción ${indice + 1}`}
              className="h-11 md:h-9"
              value={opcion.etiqueta}
              onChange={(evento) => {
                alCambiar(
                  opciones.map((otra) =>
                    otra.clave === opcion.clave ? { ...otra, etiqueta: evento.target.value } : otra,
                  ),
                )
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 md:size-8"
              aria-label={`Quitar la opción ${opcion.etiqueta}`}
              onClick={() => {
                alCambiar(opciones.filter((otra) => otra.clave !== opcion.clave))
              }}
            >
              <XIcon aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <Input
          aria-label="Nueva opción"
          placeholder="Nueva opción"
          className="h-11 md:h-9"
          value={nueva}
          onChange={(evento) => {
            setNueva(evento.target.value)
          }}
          onKeyDown={(evento) => {
            // Enter agrega la opción; no envía el formulario del campo.
            if (evento.key === 'Enter') {
              evento.preventDefault()
              agregar()
            }
          }}
        />
        <Button
          variant="outline"
          className="h-11 shrink-0 md:h-9"
          disabled={nueva.trim() === ''}
          onClick={agregar}
        >
          <PlusIcon aria-hidden />
          Agregar
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
