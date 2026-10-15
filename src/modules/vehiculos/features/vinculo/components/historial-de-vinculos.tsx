'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { formatearFecha } from '@/shared/lib/fechas'
import { RUTAS } from '@/shared/lib/rutas'
import { Bloque } from '@/shared/ui/bloque'
import { useRegional } from '@/shared/ui/regional'
import { rotuloDeVehiculo, type VinculoCerrado } from '../../../entities/vehiculos-del-lead'

// Los vínculos de este lead que ya se cerraron: una línea por vínculo, sin personas. Sólo los de
// vehículos que quien mira ve (la base no entrega los otros).
export function HistorialDeVinculos({ historial }: { historial: readonly VinculoCerrado[] }) {
  const { zonaHoraria: zona } = useRegional()
  return (
    <Bloque titulo="Vínculos anteriores" plegado>
      <ul aria-label="Vínculos anteriores" className="grid gap-2 text-(length:--text-sm)">
        {historial.map((vinculo) => (
          <li key={`${vinculo.vehiculoId}-${vinculo.desde}`} className="grid gap-0.5">
            <Link
              href={`${RUTAS.vehiculos}/${vinculo.vehiculoId}` as Route}
              className="w-fit font-medium underline-offset-2 hover:underline"
            >
              {rotuloDeVehiculo(vinculo)}
            </Link>
            <span className="text-(length:--text-xs) text-(--color-ink-soft)">
              Vinculado el {formatearFecha(vinculo.desde, { zona })}, desvinculado el{' '}
              {formatearFecha(vinculo.hasta, { zona })}
            </span>
          </li>
        ))}
      </ul>
    </Bloque>
  )
}
