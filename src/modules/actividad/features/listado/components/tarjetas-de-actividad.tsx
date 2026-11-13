'use client'

import { formatearHora } from '@/shared/lib/fechas'
import { TarjetaDeLista } from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import type { DiaDeActividad } from '../../../entities/filtros'
import { textosDeLaFila } from './celdas-de-actividad'

// La actividad en el celular: un título por día y una tarjeta por cambio, con lo mismo que la fila de la tabla.
export function TarjetasDeActividad({ dias }: { dias: readonly DiaDeActividad[] }) {
  const { zonaHoraria } = useRegional()
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {dias.map((dia) => (
        <section key={dia.dia} className="grid min-w-0 gap-2">
          <h2 className="text-(length:--text-sm) font-medium text-(--color-ink-soft)">
            {dia.titulo}
          </h2>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
            {dia.filas.map((fila) => {
              const textos = textosDeLaFila(fila)
              return (
                <TarjetaDeLista key={fila.id}>
                  <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 [overflow-wrap:anywhere]">
                    <span className="font-medium text-(--color-ink)">{textos.persona}</span>
                    <span>
                      {textos.accion} · {textos.entidad}
                    </span>
                    <span className="text-(length:--text-sm) text-(--color-ink-soft) tabular-nums">
                      {formatearHora(fila.creadoEn, { zona: zonaHoraria })}
                    </span>
                  </p>
                  <p className="text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
                    {textos.campos}
                  </p>
                </TarjetaDeLista>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
