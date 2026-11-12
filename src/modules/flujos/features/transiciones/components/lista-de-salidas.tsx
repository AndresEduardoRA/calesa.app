'use client'

import type { FlujoParaConfigurar } from '../../../entities/flujo'
import type { RolLeido } from '../../../entities/lectura-de-fase'
import type { SalidasDeLaFase } from '../hooks/use-salidas-de-la-fase'
import { FilaDeSalida } from './fila-de-salida'

type Props = {
  flujo: FlujoParaConfigurar
  salidas: SalidasDeLaFase
  roles: readonly RolLeido[]
  prefijo: string
  esFinal: boolean
  alPedirQuitar: (id: string) => void
}

// Las salidas de la fase en el orden de su fase destino, una fila cada una. Sin salidas, lo dice: un final no necesita una.
export function ListaDeSalidas({ flujo, salidas, roles, prefijo, esFinal, alPedirQuitar }: Props) {
  if (salidas.salidas.length === 0) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        {esFinal
          ? 'Esta fase no tiene salidas: es un final.'
          : 'Esta fase no tiene salidas: es un final o le falta una.'}
      </p>
    )
  }
  return (
    <ul className="grid gap-1.5" aria-label="Salidas de la fase">
      {salidas.salidas.map((salida) => (
        <FilaDeSalida
          key={salida.id}
          flujo={flujo}
          salida={salida}
          roles={roles}
          marca={`${prefijo}-${salida.id}`}
          escribiendo={salidas.enCurso}
          alPedirQuitar={() => {
            alPedirQuitar(salida.id)
          }}
        />
      ))}
    </ul>
  )
}
