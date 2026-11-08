'use client'

import { conteoEnFrase } from '@/shared/lib/conteo'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import { Skeleton } from '@/shared/ui/skeleton'
import { useReportes } from '../hooks/use-reportes'

// Los motivos de los reportes de una cotización, dentro del Confirmar de moderar (4.27-4): hasta 20, del más nuevo al más viejo. Sin «Ver más» a propósito: hay uno
// por persona (lo acota el equipo) y moderar no depende de leerlos todos. Si no cargan, se puede reintentar y confirmar igual.
export function ListaDeReportes({ cotizacionId }: { cotizacionId: string }) {
  const { estado, reintentar } = useReportes(cotizacionId)
  const { zonaHoraria } = useRegional()
  if (estado.cargando) {
    return (
      <div className="grid gap-2" aria-busy="true" aria-label="Cargando los reportes">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    )
  }
  if ('error' in estado) {
    return (
      <p className="flex flex-wrap items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft)">
        {estado.error.mensaje}
        <Button variant="outline" size="sm" className="min-h-11 md:min-h-8" onClick={reintentar}>
          Reintentar
        </Button>
      </p>
    )
  }
  if (estado.reportes.length === 0) {
    return <p className="text-(length:--text-sm) text-(--color-ink-soft)">Sin reportes.</p>
  }
  return (
    <div className="grid gap-2">
      <ul className="grid max-h-60 gap-2 overflow-y-auto" aria-label="Reportes">
        {estado.reportes.map((reporte, i) => (
          <li
            key={`${reporte.creadoEn}-${String(i)}`}
            className="grid gap-0.5 rounded-md border border-(--color-line) p-2 text-(length:--text-sm)"
          >
            <span className="[overflow-wrap:anywhere] whitespace-pre-line text-(--color-ink)">
              {reporte.motivo}
            </span>
            <span className="text-(length:--text-xs) text-(--color-ink-soft)">
              {formatearFechaHora(reporte.creadoEn, { zona: zonaHoraria })}
            </span>
          </li>
        ))}
      </ul>
      {estado.hayMas ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Hay {conteoEnFrase({ n: TAMANO_DE_VER_MAS, hayMas: true })} reportes.
        </p>
      ) : null}
    </div>
  )
}
