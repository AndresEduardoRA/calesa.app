'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { HAY_MAS_DESTINOS, SIN_DESTINOS, SIN_FASE } from '../../../entities/mover/textos'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { useBorradorDeMover } from '../hooks/use-borrador-de-mover'
import { useParaMover } from '../hooks/use-para-mover'
import { DestinoDeMover } from './destino-de-mover'
import { FueraDeRegla } from './fuera-de-regla'

// El hueco «Qué falta» del panel de la unidad (6.04): a dónde puede ir la unidad y, para cada destino, lo que esa fase le pide. Nace abierto (es lo primero que se mira para mover). Se relee al volver
// el foco a la ventana y cuando otro hueco avisa que cambió algo; sin realtime.
export function HuecoQueFalta({ unidad }: { unidad: Unidad }) {
  const { lectura, actualizando, reintentar, releer } = useParaMover(unidad)
  const borrador = useBorradorDeMover()
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
  const { dato } = lectura
  return (
    <div className="grid gap-3" data-hueco="que-falta" data-estado="listo">
      <p aria-live="polite" className="min-h-4 text-(length:--text-sm) text-(--color-ink-faint)">
        {actualizando ? 'Actualizando…' : ''}
      </p>
      {dato.faseActualId === null ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{SIN_FASE}</p>
      ) : null}
      {dato.fueraDeRegla.length > 0 ? <FueraDeRegla faltan={dato.fueraDeRegla} /> : null}
      {dato.destinos.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{SIN_DESTINOS}</p>
      ) : (
        <ul className="grid gap-3">
          {dato.destinos.map((destino) => (
            <DestinoDeMover
              key={destino.faseId}
              unidad={unidad}
              destino={destino}
              puedeMover={dato.puedeMover}
              borrador={borrador}
              releer={releer}
            />
          ))}
        </ul>
      )}
      {dato.hayMasDestinos ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{HAY_MAS_DESTINOS}</p>
      ) : null}
    </div>
  )
}
