import type { ReactNode } from 'react'
import { TEMAS_DE_UN_TONO, type Tono } from '../../../entities/diseno/tonos'
import { MuestraDeTono } from './muestra-de-tono'

type Props = {
  tono: Tono
  // Lo que se hace con el tono (editar y eliminar), si hay.
  acciones?: ReactNode
}

// Un tono del catálogo: su nombre, su clave en texto suave (la nombran los grupos de una fórmula y no cambia) y sus dos muestras. Al 200 % la fila se apila.
export function FilaDeTono({ tono, acciones }: Props) {
  return (
    <li
      data-tono={tono.clave}
      className="@container rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="grid min-w-0 flex-1 basis-48 gap-0.5">
          <span className="truncate font-medium text-(--color-ink)" title={tono.nombre}>
            {tono.nombre}
          </span>
          <span className="truncate text-(length:--text-sm) text-(--color-ink-faint)">
            {tono.clave}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {TEMAS_DE_UN_TONO.map((tema) => (
            <MuestraDeTono key={tema} tema={tema} colores={tono.colores[tema]} />
          ))}
        </div>
        {acciones}
      </div>
    </li>
  )
}
