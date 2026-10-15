'use client'

import { UnlinkIcon } from 'lucide-react'
import { formatearFecha } from '@/shared/lib/fechas'
import { Bloque } from '@/shared/ui/bloque'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import type { VehiculoVinculado } from '../../../entities/vehiculos-del-lead'
import { FilaDeVehiculoDelLead } from './fila-de-vehiculo-del-lead'

type Props = {
  vinculados: readonly VehiculoVinculado[]
  enCurso: boolean
  alDesvincular: (vehiculo: VehiculoVinculado) => void
}

// Los vehículos vinculados a este lead (el vínculo activo: el lead es su dueño o comprador). Desvincular
// pide sólo poder editar el vehículo, no el lead.
export function ListaDeVinculados({ vinculados, enCurso, alDesvincular }: Props) {
  const { zonaHoraria: zona } = useRegional()
  return (
    <Bloque titulo="Vinculados">
      {vinculados.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Ningún vehículo que puedas ver está vinculado a este lead.
        </p>
      ) : (
        <ul aria-label="Vehículos vinculados" className="divide-y divide-(--color-line)">
          {vinculados.map((vehiculo) => (
            <FilaDeVehiculoDelLead
              key={vehiculo.id}
              vehiculo={vehiculo}
              detalle={
                vehiculo.desde ? (
                  <span className="text-(length:--text-xs) text-(--color-ink-soft)">
                    Vinculado desde el {formatearFecha(vehiculo.desde, { zona })}
                  </span>
                ) : null
              }
              acciones={
                vehiculo.editable ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11 md:min-h-8"
                    disabled={enCurso}
                    aria-label={`Desvincular ${vehiculo.titulo}`}
                    onClick={() => {
                      alDesvincular(vehiculo)
                    }}
                  >
                    <UnlinkIcon aria-hidden />
                    Desvincular
                  </Button>
                ) : null
              }
            />
          ))}
        </ul>
      )}
    </Bloque>
  )
}
