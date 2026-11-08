'use client'

import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { MAXIMO_DE_ATAJOS } from '../../../entities/diseno'

type Atajos = { nodo: string; columna: string; filas: number }

type Props = {
  seccionId: string
  item: Atajos
  etiqueta: string
  // Las columnas que la base permite para estos atajos (la actual siempre va).
  columnas: readonly string[]
  ocupado: boolean
  alPonerAtajos: (cambios: { columna?: string; filas?: number }) => void
}

// Atajos: chips con las primeras filas de la tabla de un nodo que ponen su valor en la celda. Se elige la columna y cuántos chips.
export function ItemDeAtajos({
  seccionId,
  item,
  etiqueta,
  columnas,
  ocupado,
  alPonerAtajos,
}: Props) {
  const base = `${seccionId}__${item.nodo}-atajos`
  return (
    <li
      className="@container min-w-0 rounded-(--radius-md) border border-(--color-line) p-3"
      data-item={`atajos:${item.nodo}`}
    >
      <p className="mb-2 text-(length:--text-sm) font-medium text-(--color-ink)">
        {`Atajos de ${etiqueta}.`}
      </p>
      <div className="grid min-w-0 gap-2 @md:grid-cols-2">
        <CampoSeleccion
          nombre={`${base}-columna`}
          etiqueta="Columna de los chips"
          opciones={columnas.map((valor) => ({ valor, etiqueta: valor }))}
          value={item.columna}
          disabled={ocupado}
          onChange={(evento) => {
            alPonerAtajos({ columna: evento.target.value })
          }}
        />
        <Campo
          nombre={`${base}-filas`}
          etiqueta={`Cuántos chips (1 a ${String(MAXIMO_DE_ATAJOS)})`}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAXIMO_DE_ATAJOS}
          value={item.filas}
          disabled={ocupado}
          ayuda="Chips con las primeras filas de la tabla; ponen su valor en la celda."
          onChange={(evento) => {
            alPonerAtajos({ filas: evento.target.valueAsNumber })
          }}
        />
      </div>
    </li>
  )
}
