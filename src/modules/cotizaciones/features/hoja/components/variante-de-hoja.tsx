'use client'

import { useId } from 'react'
import { textoDelCandado } from '../../../entities/binding'
import type { VarianteDeHoja as Variante } from '../../../entities/hoja'

type Props = {
  item: Variante
  // La clave elegida; sin elegir, la que trae la fórmula por defecto.
  elegida: string | null
  alElegir: (clave: string) => void
}

// La variante (Moto, Auto gasolina…): una sola opción a la vez, con radios nativos (una parada de Tab, las flechas cambian de opción).
export function VarianteDeHoja({ item, elegida, alElegir }: Props) {
  const nombre = useId()
  return (
    <fieldset
      disabled={!item.editable}
      className="grid min-w-0 gap-2 border-0 p-0"
      aria-describedby={item.editable ? undefined : `${nombre}-motivo`}
    >
      <legend className="mb-1 text-(length:--text-sm) font-medium text-(--color-ink)">
        {item.etiqueta}
      </legend>
      <div className="flex flex-wrap gap-2">
        {item.opciones.map((opcion) => (
          <label
            key={opcion.clave}
            className="flex min-h-11 cursor-pointer items-center rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-3 text-(length:--text-sm) text-(--color-ink) has-checked:border-(--color-primario) has-checked:bg-(--color-primario-soft) has-checked:font-medium has-focus-visible:shadow-(--shadow-focus) has-disabled:cursor-not-allowed has-disabled:opacity-70 md:min-h-9"
          >
            <input
              type="radio"
              name={nombre}
              value={opcion.clave}
              checked={elegida === opcion.clave}
              onChange={() => {
                alElegir(opcion.clave)
              }}
              className="sr-only"
            />
            {opcion.etiqueta}
          </label>
        ))}
      </div>
      {item.editable ? null : (
        <p id={`${nombre}-motivo`} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {textoDelCandado(item.motivo)}
        </p>
      )}
    </fieldset>
  )
}
