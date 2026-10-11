'use client'

import { useId } from 'react'
import { Input } from '@/shared/ui/input'
import { ETIQUETA_FILTRO, FILTROS_DE_ESTADO, type FiltroDeEstado } from '../../../entities/persona'

type Props = {
  texto: string
  estado: FiltroDeEstado
  alBuscar: (texto: string) => void
  alFiltrar: (estado: FiltroDeEstado) => void
}

function esFiltro(valor: string): valor is FiltroDeEstado {
  return FILTROS_DE_ESTADO.some((filtro) => filtro === valor)
}

// Buscar por nombre o correo y elegir qué estados ver. Los dos viven en la URL.
export function FiltrosEquipo({ texto, estado, alBuscar, alFiltrar }: Props) {
  const idBusqueda = useId()
  const idEstado = useId()
  return (
    <div className="flex flex-wrap gap-2">
      <label htmlFor={idBusqueda} className="sr-only">
        Buscar por nombre o correo
      </label>
      <Input
        id={idBusqueda}
        type="search"
        placeholder="Buscar por nombre o correo"
        className="h-11 w-full sm:w-64 md:h-9"
        value={texto}
        onChange={(evento) => {
          alBuscar(evento.target.value)
        }}
      />
      <label htmlFor={idEstado} className="sr-only">
        Estado
      </label>
      <select
        id={idEstado}
        className="h-11 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-2.5 text-(length:--text-sm) text-(--color-ink) md:h-9"
        value={estado}
        onChange={(evento) => {
          if (esFiltro(evento.target.value)) {
            alFiltrar(evento.target.value)
          }
        }}
      >
        {FILTROS_DE_ESTADO.map((filtro) => (
          <option key={filtro} value={filtro}>
            {ETIQUETA_FILTRO[filtro]}
          </option>
        ))}
      </select>
    </div>
  )
}
