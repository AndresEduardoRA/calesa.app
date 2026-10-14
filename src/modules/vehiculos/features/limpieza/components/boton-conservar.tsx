'use client'

import { ArchiveRestoreIcon, ShieldCheckIcon } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { Button } from '@/shared/ui/button'
import { conservarVehiculo } from '../actions/conservar-vehiculo'
import { respuestaDe } from '../../fotos/envio'

type Props = {
  vehiculoId: string
  // El estado al que lleva el clic: true = «Conservar», false = «Quitar».
  conservar: boolean
  // Quien no puede editar el vehículo lo ve apagado, con el motivo.
  habilitado: boolean
  motivo?: string
}

// «Conservar» / «Quitar»: la limpieza automática no toca lo marcado. Manda el estado deseado, así
// que un reintento o un doble clic dan lo mismo.
export function BotonConservar({ vehiculoId, conservar, habilitado, motivo }: Props) {
  const { executeAsync, isPending } = useAction(conservarVehiculo)

  async function alHacer(): Promise<void> {
    const hecho = await respuestaDe(executeAsync({ vehiculoId, conservar }))
    if (hecho.ok) {
      avisarExito(
        conservar
          ? 'Listo: este vehículo se conserva y la limpieza no lo toca.'
          : 'Listo: este vehículo vuelve a la limpieza automática.',
      )
    } else {
      avisarError(hecho.error)
    }
  }

  const Icono = conservar ? ShieldCheckIcon : ArchiveRestoreIcon
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!habilitado || isPending}
      title={!habilitado ? motivo : undefined}
      onClick={() => void alHacer()}
      className="min-h-11 md:min-h-8"
    >
      <Icono aria-hidden />
      {conservar ? 'Conservar' : 'Quitar'}
      {!habilitado && motivo ? <span className="sr-only">: {motivo}</span> : null}
    </Button>
  )
}
