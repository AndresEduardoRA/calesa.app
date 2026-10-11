'use client'

import { COLORES_DE_ROL } from '../../../entities/rol'

export type ColorDeRol = (typeof COLORES_DE_ROL)[number]['valor']

type Props = { valor: ColorDeRol; alCambiar: (color: ColorDeRol) => void }

// El color de un rol: radios nativos con otra piel, cada uno con su nombre (nunca sólo el color).
export function SelectorDeColor({ valor, alCambiar }: Props) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-(length:--text-sm) font-medium text-(--color-ink)">
        Color
      </legend>
      <div className="flex flex-wrap gap-1">
        {COLORES_DE_ROL.map((opcion) => (
          <label key={opcion.valor} className="cursor-pointer">
            <input
              type="radio"
              name="color"
              value={opcion.valor}
              checked={valor === opcion.valor}
              className="peer sr-only"
              onChange={() => {
                alCambiar(opcion.valor)
              }}
            />
            <span className="flex min-h-11 items-center gap-1.5 rounded-(--radius-md) border border-(--color-line) px-2.5 text-(length:--text-sm) text-(--color-ink-soft) peer-checked:border-(--color-line-strong) peer-checked:bg-(--color-paper-dim) peer-checked:font-medium peer-checked:text-(--color-ink) peer-focus-visible:shadow-(--shadow-focus) md:min-h-8">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: opcion.valor }}
              />
              {opcion.nombre}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
