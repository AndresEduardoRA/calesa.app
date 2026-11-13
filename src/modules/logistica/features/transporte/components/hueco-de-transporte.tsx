'use client'

import { puede } from '@/shared/lib/permisos'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { TEXTO_DE_REPUESTO } from '../../../entities/transporte/transporte'
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

function DeUnVehiculo({ unidad }: { unidad: Unidad }) {
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

// El hueco «Transporte» del panel de la unidad (6.08-2): naviera, puertos, contenedor, booking, fechas y notas, con la oferta del flujo, guardado con versión y conflicto «Recargar». La unidad de
// repuesto llega con 8.13: aquí sólo se dice (D19).
export function HuecoDeTransporte({ unidad }: { unidad: Unidad }) {
  if (unidad.tipo === 'repuesto') {
    return <p className="text-(length:--text-sm) text-(--color-ink-soft)">{TEXTO_DE_REPUESTO}</p>
  }
  return <DeUnVehiculo unidad={unidad} />
}
