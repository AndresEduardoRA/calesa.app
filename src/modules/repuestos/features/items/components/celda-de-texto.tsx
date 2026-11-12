'use client'

import { useId, useRef, useState } from 'react'
import { cn } from 'cn'

type Props = {
  // Su nombre accesible: «Descripción del ítem Faro».
  etiqueta: string
  // La columna: la hoja baja con Enter a la misma columna de la fila siguiente.
  columna: string
  valor: string | null
  editable: boolean
  maximo: number
  error?: string | undefined
  alGuardar: (valor: string) => Promise<void>
}

const CAJA =
  'h-11 w-full min-w-0 rounded-lg border border-(--color-line-strong) bg-(--color-surface) px-2.5 text-(length:--text-base) text-(--color-ink) outline-none md:h-9 md:text-(length:--text-sm) focus-visible:shadow-(--shadow-focus) aria-invalid:border-(--color-peligro)'

// Enter baja a la misma columna de la fila siguiente (de una tabla o de las tarjetas); no hay fila siguiente, se queda.
function bajar(entrada: HTMLInputElement, columna: string) {
  const fila = entrada.closest('[data-fila-de-item]')
  const siguiente = fila?.nextElementSibling?.querySelector<HTMLElement>(
    `[data-celda="${columna}"]`,
  )
  siguiente?.focus()
}

// Una celda de texto de la hoja (8.09-2, C8): una entrada que guarda al pulsar Enter o al salir si cambió; Esc vuelve a lo guardado. Lo escrito queda si el guardado falla (el motivo va debajo y se
// puede reintentar tal cual). Sin `repuestos.editar` (o con el proyecto cerrado), texto plano.
export function CeldaDeTexto({
  etiqueta,
  columna,
  valor,
  editable,
  maximo,
  error,
  alGuardar,
}: Props) {
  const idDelError = useId()
  const [borrador, setBorrador] = useState(valor ?? '')
  const [vista, setVista] = useState(valor)
  const enVuelo = useRef(false)
  if (vista !== valor) {
    setVista(valor)
    setBorrador(valor ?? '')
  }
  if (!editable) {
    return valor ? (
      <span className="[overflow-wrap:anywhere]">{valor}</span>
    ) : (
      <span className="text-(--color-ink-faint)">—</span>
    )
  }

  function confirmar() {
    if (enVuelo.current || borrador.trim() === (valor ?? '')) {
      return
    }
    enVuelo.current = true
    void alGuardar(borrador).finally(() => {
      enVuelo.current = false
    })
  }

  return (
    <div className="grid min-w-0 gap-1">
      <input
        type="text"
        aria-label={etiqueta}
        data-celda={columna}
        value={borrador}
        maxLength={maximo}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idDelError : undefined}
        className={cn(CAJA)}
        onChange={(evento) => {
          setBorrador(evento.target.value)
        }}
        onBlur={confirmar}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') {
            evento.preventDefault()
            confirmar()
            bajar(evento.currentTarget, columna)
          } else if (evento.key === 'Escape') {
            setBorrador(valor ?? '')
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
