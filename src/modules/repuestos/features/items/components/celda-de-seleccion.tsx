'use client'

import { useId } from 'react'

export type OpcionDeCelda = { valor: string; etiqueta: string }

type Props = {
  etiqueta: string
  columna: string
  // El id (o código) elegido; nulo = sin definir.
  valor: string | null
  // Lo que se ofrece: ya filtrado (los activos más el actual). Sin opción vacía: `vacio` la agrega.
  opciones: readonly OpcionDeCelda[]
  // La etiqueta de «ninguno», si se puede dejar sin elegir.
  vacio?: string
  editable: boolean
  error?: string | undefined
  alGuardar: (valor: string | null) => Promise<void>
}

const CAJA =
  'h-11 w-full min-w-0 rounded-lg border border-(--color-line-strong) bg-(--color-surface) px-2 text-(length:--text-base) text-(--color-ink) outline-none md:h-9 md:text-(length:--text-sm) focus-visible:shadow-(--shadow-focus) aria-invalid:border-(--color-peligro)'

// Una celda de elección de la hoja (8.09-2, C8): un `<select>` nativo (en el celular abre el selector del sistema) que guarda al elegir. El valor guardado manda: si el guardado falla, vuelve a él.
// Sin permiso o con el proyecto cerrado, texto plano.
export function CeldaDeSeleccion({
  etiqueta,
  columna,
  valor,
  opciones,
  vacio,
  editable,
  error,
  alGuardar,
}: Props) {
  const idDelError = useId()
  if (!editable) {
    const actual = opciones.find((o) => o.valor === valor)?.etiqueta
    return actual ? (
      <span className="[overflow-wrap:anywhere]">{actual}</span>
    ) : (
      <span className="text-(--color-ink-faint)">—</span>
    )
  }
  return (
    <div className="grid min-w-0 gap-1">
      <select
        aria-label={etiqueta}
        data-celda={columna}
        value={valor ?? ''}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idDelError : undefined}
        className={CAJA}
        onChange={(evento) => {
          void alGuardar(evento.target.value === '' ? null : evento.target.value)
        }}
      >
        {vacio === undefined ? null : <option value="">{vacio}</option>}
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
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
