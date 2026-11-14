'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { useBorradorDeMover } from '../hooks/use-borrador-de-mover'
import { useModoGanada } from '../hooks/use-modo-ganada'
import { useParaMover } from '../hooks/use-para-mover'
import { CuerpoDeQueFalta } from './cuerpo-de-que-falta'

// El hueco «Qué falta» del panel de la unidad (6.04): a dónde puede ir la unidad y, para cada destino, lo que esa fase le pide. Nace abierto (es lo primero que se mira para mover). Se relee al volver
// el foco a la ventana y cuando otro hueco avisa que cambió algo; sin realtime. Con `?ganada=si` (sólo un vehículo) es «La ganamos»: los destinos que no son la
// subasta, el primero abierto, y mover anota la subasta ganada.
export function HuecoQueFalta({ unidad }: { unidad: UnidadAbierta }) {
  const { lectura, actualizando, reintentar, releer } = useParaMover(unidad)
  const modoGanada = useModoGanada()
  const borrador = useBorradorDeMover(
    modoGanada.activo && unidad.tipo === 'vehiculo' ? modoGanada : null,
  )
  if (lectura.tipo === 'cargando') {
    return (
      <div aria-busy="true" aria-label="Cargando lo que falta" className="grid gap-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    )
  }
  if (lectura.tipo === 'error') {
    return (
      <div className="grid gap-2">
        <Aviso tono={lectura.error.codigo === 'sin_permiso' ? 'info' : 'peligro'}>
          <p>{lectura.error.mensaje}</p>
        </Aviso>
        {lectura.error.codigo === 'sin_permiso' ? null : (
          <div>
            <Button variant="outline" onClick={reintentar}>
              Reintentar
            </Button>
          </div>
        )}
      </div>
    )
  }
  return (
    <CuerpoDeQueFalta
      unidad={unidad}
      dato={lectura.dato}
      actualizando={actualizando}
      releer={releer}
      borrador={borrador}
      modoGanada={modoGanada}
    />
  )
}
