'use client'

import { useId } from 'react'
import { CampoDeBusqueda } from '@/shared/ui/filtros/controles'
import { MINIMO_DE_BUSQUEDA_DEL_EQUIPO } from '../../../entities/lista-equipo'
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

// Buscar por nombre o correo y elegir qué estados ver. Los dos viven en la URL. El marcador es corto a propósito (5a-26): «Buscar por nombre o correo» no
// cabía en el campo del celular al 200 % y se leía «Buscar por nombre c»; la etiqueta (para lectores de pantalla) sí lo dice entero. Busca desde 3 letras
// (5a-31): con menos, `CampoDeBusqueda` deja lo escrito en el campo, dice «Escribe al menos 3 letras» en una fila al final y no lo manda a la URL.
export function FiltrosEquipo({ texto, estado, alBuscar, alFiltrar }: Props) {
  const idEstado = useId()
  return (
    <div className="flex flex-wrap gap-2">
      <CampoDeBusqueda
        etiqueta="Buscar por nombre o correo"
        marcador="Nombre o correo"
        minimo={MINIMO_DE_BUSQUEDA_DEL_EQUIPO}
        valor={texto}
        alBuscar={alBuscar}
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
