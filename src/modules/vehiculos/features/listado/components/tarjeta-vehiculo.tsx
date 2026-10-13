'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { Monto } from '@/shared/ui/monto'
import { camposDeTarjeta, type CampoDeVehiculo } from '../../../entities/campo'
import type { Vehiculo } from '../../../entities/vehiculo'
import { BadgeDeFase } from './badge-de-fase'
import { Miniatura } from './miniatura'
import { ValorDeCampo } from './valor-de-campo'

type Props = {
  vehiculo: Vehiculo
  // El layout del origen del vehículo: de ahí salen los datos «en tarjeta».
  campos: readonly CampoDeVehiculo[]
  fase: { nombre: string; color: string } | null
  // A dónde lleva el título (la ficha); sin esto es sólo texto.
  href?: string
}

// Un vehículo en una tarjeta: lo que se ve en el celular en vez de la fila de la tabla, y lo que
// otros módulos usan para mostrar un vehículo.
export function TarjetaVehiculo({ vehiculo, campos, fase, href }: Props) {
  const datos = camposDeTarjeta(campos).filter((campo) => {
    const valor = vehiculo.atributos[campo.clave]
    return valor !== undefined && valor !== null && valor !== ''
  })
  return (
    <article className="grid gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3">
      <div className="flex items-start gap-3">
        <Miniatura className="w-20" />
        <div className="grid min-w-0 flex-1 gap-1">
          <h3 className="text-(length:--text-base) font-medium text-(--color-ink)">
            {href ? (
              <Link
                href={href as Route}
                className="underline-offset-2 outline-none hover:underline focus-visible:shadow-(--shadow-focus)"
              >
                {vehiculo.titulo}
              </Link>
            ) : (
              vehiculo.titulo
            )}
          </h3>
          <p className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums">
            #{vehiculo.numero}
            {vehiculo.anio ? ` · ${String(vehiculo.anio)}` : ''}
            {vehiculo.vin ? ` · ${vehiculo.vin}` : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <BadgeDeFase fase={fase} />
            {vehiculo.precio === null ? null : (
              <Monto valor={vehiculo.precio} className="text-(length:--text-sm) font-medium" />
            )}
          </div>
        </div>
      </div>
      {datos.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-(--color-line) pt-3">
          {datos.map((campo) => (
            <div key={campo.clave} className="grid min-w-0">
              <dt className="truncate text-(length:--text-xs) text-(--color-ink-soft)">
                {campo.etiqueta}
              </dt>
              <dd className="truncate text-(length:--text-sm) text-(--color-ink)">
                <ValorDeCampo campo={campo} valor={vehiculo.atributos[campo.clave]} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  )
}
