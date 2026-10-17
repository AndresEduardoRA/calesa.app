'use client'

import { XIcon } from 'lucide-react'
import { formatearFecha } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { textoDelTope } from '@/shared/lib/conteo'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Bloque } from '@/shared/ui/bloque'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import {
  TOPE_DE_INTERESADOS_DEL_LEAD,
  type VehiculoInteresado,
} from '../../../entities/vehiculos-del-lead'
import { FilaDeVehiculoDelLead } from './fila-de-vehiculo-del-lead'

type Props = {
  interesados: readonly VehiculoInteresado[]
  puedoActuar: boolean
  enCurso: boolean
  alQuitar: (vehiculo: VehiculoInteresado) => void
  // Llegó a su tope (`TOPE_DE_INTERESADOS_DEL_LEAD`) y hay más que no se ven: se dice al pie.
  hayMas?: boolean
}

// Los vehículos en los que el lead mostró interés, con su nota. No anclan nada: son una lista de
// trabajo. Quitar se hace y ofrece «Deshacer».
export function ListaDeInteresados({
  interesados,
  puedoActuar,
  enCurso,
  alQuitar,
  hayMas = false,
}: Props) {
  const { zonaHoraria: zona } = useRegional()
  return (
    <Bloque titulo="Interesados">
      {interesados.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Este lead no mostró interés en ningún vehículo que puedas ver.
        </p>
      ) : (
        <ul aria-label="Vehículos de interés" className="divide-y divide-(--color-line)">
          {interesados.map((vehiculo) => (
            <FilaDeVehiculoDelLead
              key={vehiculo.id}
              vehiculo={vehiculo}
              detalle={
                <>
                  {vehiculo.nota ? (
                    <span className="text-(length:--text-sm) break-words">{vehiculo.nota}</span>
                  ) : null}
                  <span className="flex flex-wrap items-center gap-2 text-(length:--text-xs) text-(--color-ink-soft)">
                    Desde el {formatearFecha(vehiculo.marcadoEn, { zona })}
                    {vehiculo.vinculadoAqui ? <Badge variant="secondary">Vinculado</Badge> : null}
                  </span>
                </>
              }
              acciones={
                puedoActuar ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11 md:min-h-8"
                    disabled={enCurso}
                    aria-label={`Quitar el interés en ${vehiculo.titulo}`}
                    onClick={() => {
                      alQuitar(vehiculo)
                    }}
                  >
                    <XIcon aria-hidden />
                    Quitar interés
                  </Button>
                ) : null
              }
            />
          ))}
        </ul>
      )}
      {hayMas ? <AvisoDeTope texto={textoDelTope(TOPE_DE_INTERESADOS_DEL_LEAD)} /> : null}
    </Bloque>
  )
}
