'use client'

import type { FlujoParaConfigurar } from '../../../entities/flujo'
import type { RolLeido } from '../../../entities/lectura-de-fase'
import type { SalidasDeLaFase } from '../hooks/use-salidas-de-la-fase'
import { FormularioDeEdicionDeSalidaDiferido } from './diferidos'
import { FilaDeSalida } from './fila-de-salida'

type Props = {
  flujo: FlujoParaConfigurar
  salidas: SalidasDeLaFase
  roles: readonly RolLeido[]
  prefijo: string
  esFinal: boolean
  // La salida que se está editando (su fila muestra la forma en su lugar) y si hay otra forma abierta que apague los «Editar».
  editandoId: string | null
  otraFormaAbierta: boolean
  alPedirEditar: (id: string) => void
  alCerrarEdicion: (id: string) => void
  alPedirQuitar: (id: string) => void
}

// Las salidas de la fase en el orden de su fase destino, una fila cada una. Sin salidas, lo dice: un final no necesita una.
export function ListaDeSalidas({
  flujo,
  salidas,
  roles,
  prefijo,
  esFinal,
  editandoId,
  otraFormaAbierta,
  alPedirEditar,
  alCerrarEdicion,
  alPedirQuitar,
}: Props) {
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
      {salidas.salidas.map((salida) =>
        salida.id === editandoId ? (
          <li key={salida.id} className="min-w-0">
            <FormularioDeEdicionDeSalidaDiferido
              flujo={flujo}
              salida={salida}
              salidas={salidas}
              roles={roles}
              alCerrar={() => {
                alCerrarEdicion(salida.id)
              }}
            />
          </li>
        ) : (
          <FilaDeSalida
            key={salida.id}
            flujo={flujo}
            salida={salida}
            roles={roles}
            marca={`${prefijo}-${salida.id}`}
            escribiendo={salidas.enCurso}
            editarDeshabilitado={otraFormaAbierta || editandoId !== null}
            alPedirEditar={() => {
              alPedirEditar(salida.id)
            }}
            alPedirQuitar={() => {
              alPedirQuitar(salida.id)
            }}
          />
        ),
      )}
    </ul>
  )
}
