'use client'

import { useId } from 'react'

type Props = {
  roles: readonly { id: string; nombre: string }[]
  valor: string
  alCambiar: (rolId: string) => void
}

// En móvil la matriz muestra un rol a la vez: acá se elige cuál. Un <select> nativo abre el
// selector del sistema, que es lo cómodo con el dedo.
export function SelectorDeRol({ roles, valor, alCambiar }: Props) {
  const id = useId()
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5 md:hidden">
      <label htmlFor={id} className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Rol a la vista
      </label>
      <select
        id={id}
        className="h-11 w-full min-w-0 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-2.5 text-(length:--text-sm) text-(--color-ink)"
        value={valor}
        onChange={(evento) => {
          alCambiar(evento.target.value)
        }}
      >
        {roles.map((rol) => (
          <option key={rol.id} value={rol.id}>
            {rol.nombre}
          </option>
        ))}
      </select>
    </div>
  )
}
