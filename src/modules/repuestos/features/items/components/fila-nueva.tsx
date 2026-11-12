'use client'

import { useId, useState } from 'react'
import { MENSAJE_DE_DESCRIPCION } from '../../../entities/items/celda'

type Props = {
  // Devuelve el motivo si no se pudo (va junto al campo) o nulo.
  alAgregar: (id: string, descripcion: string) => Promise<string | null>
}

const CAJA =
  'h-11 w-full min-w-0 rounded-lg border border-dashed border-(--color-line-strong) bg-(--color-surface) px-2.5 text-(length:--text-base) text-(--color-ink) outline-none md:h-9 md:text-(length:--text-sm) focus-visible:shadow-(--shadow-focus) aria-invalid:border-(--color-peligro)'

// La fila nueva de la hoja (8.09-2, C10): escribir la descripción y pulsar Enter agrega el ítem, y el foco queda en la fila nueva vacía: dos ítems se cargan sólo con el teclado. El `id` del intento
// se genera al abrirse la fila y se conserva en cada reintento (la base es idempotente por id: un corte no duplica); tras agregar se renueva.
export function FilaNueva({ alAgregar }: Props) {
  const idDelError = useId()
  const [intento, setIntento] = useState(() => crypto.randomUUID())
  const [texto, setTexto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  async function agregar() {
    if (enCurso) {
      return
    }
    if (texto.trim() === '') {
      setError(MENSAJE_DE_DESCRIPCION)
      return
    }
    setError(null)
    setEnCurso(true)
    const motivo = await alAgregar(intento, texto)
    setEnCurso(false)
    if (motivo === null) {
      setTexto('')
      setIntento(crypto.randomUUID())
    } else {
      setError(motivo)
    }
  }

  return (
    <div className="grid min-w-0 gap-1">
      <input
        type="text"
        aria-label="Nuevo ítem: descripción"
        placeholder="Nuevo ítem: escribe la descripción y pulsa Enter"
        data-celda="descripcion"
        value={texto}
        readOnly={enCurso}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idDelError : undefined}
        className={CAJA}
        onChange={(evento) => {
          setTexto(evento.target.value)
          setError(null)
        }}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') {
            evento.preventDefault()
            void agregar()
          }
        }}
      />
      {error ? (
        <p
          id={idDelError}
          role="alert"
          className="text-(length:--text-sm) text-(--color-peligro-ink)"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
