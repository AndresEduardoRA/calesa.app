'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { AbrirResumen, TarjetaDeLista } from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import {
  estadoDeLaFila,
  textoDeItems,
  vehiculoDeLaFila,
  type FilaDeProyecto,
} from '../../../entities/proyectos/listado'
import { EstadoDelProyecto } from './estado-del-proyecto'

type Props = { proyectos: readonly FilaDeProyecto[]; alAbrir: (id: string) => void }

// Los proyectos de la página en el celular: una tarjeta por proyecto, con lo mismo que la fila de la tabla. Un toque abre el proyecto.
export function TarjetasDeProyectos({ proyectos, alAbrir }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {proyectos.map((proyecto) => {
        const vehiculo = vehiculoDeLaFila(proyecto)
        return (
          <TarjetaDeLista
            key={proyecto.id}
            alAbrir={() => {
              alAbrir(proyecto.id)
            }}
          >
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <AbrirResumen
                nombre={`proyecto ${String(proyecto.numero)}`}
                className="min-w-0 font-medium break-words text-(--color-ink) tabular-nums"
              >
                #{proyecto.numero} · {vehiculo.titulo}
              </AbrirResumen>
              <EstadoDelProyecto estado={estadoDeLaFila(proyecto)} />
            </div>
            {vehiculo.detalle ? (
              <p className="text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
                {vehiculo.detalle}
              </p>
            ) : null}
            <p className="text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
              {proyecto.clienteNombre ?? 'Sin cliente'} · {textoDeItems(proyecto.items)} ítems ·{' '}
              {formatearFecha(proyecto.ultimaActividad, { zona: zonaHoraria })}
            </p>
          </TarjetaDeLista>
        )
      })}
    </ul>
  )
}
