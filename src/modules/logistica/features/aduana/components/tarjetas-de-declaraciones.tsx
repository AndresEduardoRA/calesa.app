'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { AbrirResumen, TarjetaDeLista } from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import { textoDelCanal, type FilaDeDeclaracion } from '../../../entities/aduana/declaracion'
import { textoDeUnidades } from '../../../entities/aduana/estado'
import { EstadoDeTributos } from './estado-de-tributos'

type Props = {
  declaraciones: readonly FilaDeDeclaracion[]
  alAbrir: (id: string) => void
  abierta: string | null
}

// Las declaraciones de la página en el celular: una tarjeta por declaración, con lo mismo que la fila de la tabla. Un toque abre el resumen.
export function TarjetasDeDeclaraciones({ declaraciones, alAbrir, abierta }: Props) {
  const { zonaHoraria } = useRegional()
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {declaraciones.map((declaracion) => (
        <TarjetaDeLista
          key={declaracion.id}
          abierta={abierta === declaracion.id}
          alAbrir={() => {
            alAbrir(declaracion.id)
          }}
        >
          <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <AbrirResumen
              nombre={`la declaración ${declaracion.numero}`}
              className="min-w-0 font-medium break-words text-(--color-ink)"
            >
              {declaracion.numero}
            </AbrirResumen>
            <Badge variant="secondary">{textoDelCanal(declaracion.canal)}</Badge>
          </div>
          <EstadoDeTributos {...declaracion} />
          <p className="text-(length:--text-sm) [overflow-wrap:anywhere] text-(--color-ink-soft)">
            {textoDeUnidades(declaracion.vehiculos)}
            {declaracion.aceptadaEl
              ? ` · aceptada el ${formatearFecha(declaracion.aceptadaEl, { zona: zonaHoraria })}`
              : ''}
            {declaracion.despachante ? ` · ${declaracion.despachante}` : ''}
          </p>
        </TarjetaDeLista>
      ))}
    </ul>
  )
}
