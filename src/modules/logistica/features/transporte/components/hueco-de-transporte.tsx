'use client'

import { puede } from '@/shared/lib/permisos'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { esUnidadDeVehiculo, type Unidad } from '../../../entities/nucleo/unidad'
import { textoDelTransporteDelItem } from '../../../entities/transporte/transporte'
import { usePermisosDeTransporte } from '../hooks/use-permisos-de-transporte'
import { useTransporteDeLaUnidad } from '../hooks/use-transporte-de-la-unidad'
import { FormularioDeTransporte } from './formulario-de-transporte'

function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando el transporte" className="grid gap-2">
      <Skeleton className="h-6" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-6" />
    </div>
  )
}

function DeUnVehiculo({ unidad }: { unidad: Unidad & { origenId: string } }) {
  const { lectura, releer, reintentar } = useTransporteDeLaUnidad(unidad)
  const permisos = usePermisosDeTransporte()
  if (lectura.tipo === 'cargando') {
    return <Cargando />
  }
  if (lectura.tipo === 'error') {
    return (
      <div className="grid gap-2">
        <Aviso tono="peligro">
          <p>{lectura.error.mensaje}</p>
        </Aviso>
        <div>
          <Button variant="outline" onClick={reintentar}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }
  return (
    <FormularioDeTransporte
      unidadId={unidad.id}
      datos={lectura.datos}
      // Mientras `mis_permisos` no llegó, el formulario está apagado.
      puedeEditar={
        permisos !== null && puede(permisos, 'logistica.transporte.editar', unidad.origenId)
      }
      puedeCargarNavieras={permisos !== null && puede(permisos, 'logistica.catalogos.gestionar')}
      releer={releer}
    />
  )
}

// El hueco «Transporte» del panel de la unidad (6.08-2): naviera, puertos, contenedor, booking, fechas y notas, con la oferta del flujo, guardado con versión y conflicto «Recargar». Un ítem
// de repuesto sigue al vehículo de su proyecto: aquí sólo se dice (D19, D5 de 8.13-2).
export function HuecoDeTransporte({ unidad }: { unidad: Unidad }) {
  if (!esUnidadDeVehiculo(unidad)) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        {textoDelTransporteDelItem(unidad.proyecto)}
      </p>
    )
  }
  return <DeUnVehiculo unidad={unidad} />
}
