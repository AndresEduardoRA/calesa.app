'use client'

import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
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
  // Lo que se puede hacer con él (editar), arriba a la derecha.
  acciones?: ReactNode
  // Lo que va al lado de la fase (si está en la vitrina).
  insignias?: ReactNode
  // La casilla para elegirlo, delante de la foto.
  seleccion?: ReactNode
}

// Un vehículo en una tarjeta: lo que se ve en el celular en vez de la fila de la tabla, y lo que
// otros módulos usan para mostrar un vehículo.
export function TarjetaVehiculo(props: Props) {
  const { vehiculo, campos, fase, href, acciones, insignias, seleccion } = props
  const datos = camposDeTarjeta(campos).filter((campo) => {
    const valor = vehiculo.atributos[campo.clave]
    return valor !== undefined && valor !== null && valor !== ''
  })
  return (
    <article className="@container grid grid-cols-[minmax(0,1fr)] gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3">
      {/* Con el texto al 200 % la tarjeta mide menos de 16 rem: la miniatura (rem), el título y «Editar» no caben en una fila y se apilan. */}
      <div className="flex items-start gap-3 @max-[16rem]:flex-col">
        {seleccion}
        <Miniatura ruta={vehiculo.portadaRuta} className="w-20" />
        <div className="grid min-w-0 flex-1 gap-1 @max-[16rem]:flex-none">
          <h3 className="text-(length:--text-base) font-medium [overflow-wrap:anywhere] text-(--color-ink)">
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
            {insignias}
            {vehiculo.precio === null ? null : (
              <Monto valor={vehiculo.precio} className="text-(length:--text-sm) font-medium" />
            )}
          </div>
        </div>
        {acciones}
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
