'use client'

import { useId } from 'react'

type Props = {
  modos: readonly { clave: string; nombre: string }[]
  // La clave elegida; nula, ninguna marcada.
  elegido: string | null
  alElegir: (clave: string) => void
}

// Los modos de tipo de cambio que declara el diseño: uno solo a la vez, con radios nativos como la variante (una parada de Tab, las flechas cambian de modo). El nombre sale de la
// base. Elegir uno pide un recálculo, como confirmar una celda.
export function ModosDeLaHoja({ modos, elegido, alElegir }: Props) {
  const nombre = useId()
  return (
    <fieldset className="grid min-w-0 gap-2 border-0 p-0">
      <legend className="mb-1 text-(length:--text-sm) font-medium text-(--color-ink)">
        Modo de tipo de cambio
      </legend>
      <div className="flex flex-wrap gap-2">
        {modos.map((modo) => (
          <label
            key={modo.clave}
            className="flex min-h-11 cursor-pointer items-center rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-3 text-(length:--text-sm) text-(--color-ink) has-checked:border-(--color-primario) has-checked:bg-(--color-primario-soft) has-checked:font-medium has-focus-visible:shadow-(--shadow-focus) md:min-h-9"
          >
            <input
              type="radio"
              name={nombre}
              value={modo.clave}
              checked={elegido === modo.clave}
              onChange={() => {
                alElegir(modo.clave)
              }}
              className="sr-only"
            />
            {modo.nombre}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
