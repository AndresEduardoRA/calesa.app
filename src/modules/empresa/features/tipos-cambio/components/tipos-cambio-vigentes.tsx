'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { RUTAS } from '@/shared/lib/rutas'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/shared/ui/popover'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import { decimalesDeValor, type TipoCambio } from '../../../entities/tipos-cambio'
import { ValorDeCambio } from './valor-de-cambio'

type Props = {
  // Los vigentes, con el por defecto adelante.
  tipos: readonly TipoCambio[]
  // Quien los gestiona tiene a mano el enlace para cambiarlos.
  puedeGestionar: boolean
}

// El tipo de cambio del día en la barra superior: a la vista el por defecto; al abrirlo, todos
// los vigentes con la fecha de su último cambio, en la zona horaria de la empresa.
export function TiposCambioVigentes({ tipos, puedeGestionar }: Props) {
  const { zonaHoraria } = useRegional()
  const [principal] = tipos
  if (!principal) {
    return null
  }

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Tipos de cambio"
        className="inline-flex h-11 items-center gap-1.5 rounded-(--radius-md) px-2 text-(length:--text-sm) text-(--color-ink) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:h-9"
      >
        <span className="hidden text-(--color-ink-soft) sm:inline">{principal.nombre}</span>
        <Monto
          valor={principal.valor}
          moneda={principal.monedaA}
          decimales={decimalesDeValor(principal.valor)}
          className="font-medium"
        />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <PopoverHeader>
          <PopoverTitle>Tipos de cambio</PopoverTitle>
          <PopoverDescription>Las horas están en {zonaHoraria}.</PopoverDescription>
        </PopoverHeader>
        <ul className="grid gap-2">
          {tipos.map((tipo) => (
            <li key={tipo.id} className="grid gap-0.5">
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-(--color-ink)">{tipo.nombre}</span>
                <ValorDeCambio tipo={tipo} />
              </span>
              <span className="text-(length:--text-xs) text-(--color-ink-faint)">
                Desde el {formatearFechaHora(tipo.actualizadoEn, { zona: zonaHoraria })}
              </span>
            </li>
          ))}
        </ul>
        {puedeGestionar ? (
          <Link
            href={`${RUTAS.empresa}?seccion=monedas` as Route}
            className="text-(length:--text-sm) font-medium text-(--color-primario-ink) underline-offset-4 outline-none hover:underline focus-visible:shadow-(--shadow-focus)"
          >
            Cambiar los tipos de cambio
          </Link>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
