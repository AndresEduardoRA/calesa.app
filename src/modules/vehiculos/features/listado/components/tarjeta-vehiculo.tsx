'use client'

import type { ReactNode } from 'react'
import { AbrirResumen, TarjetaDeLista } from '@/shared/ui/lista'
import { cn } from 'cn'
import { camposDeTarjeta, type CampoDeVehiculo } from '../../../entities/campo'
import type { PrecioDeLaFila } from '../../../entities/precio-de-la-fila'
import type { Vehiculo } from '../../../entities/vehiculo'
import { useIdentidad } from '../hooks/use-identidad'
import { BadgeDeFase } from './badge-de-fase'
import { PrecioDeTarjeta } from './precio-de-la-fila'
import { ValorDeCampo } from './valor-de-campo'
import { FotosEnElLugar } from '../../fotos/components/fotos-en-el-lugar'

type Props = {
  vehiculo: Vehiculo
  // El layout del origen del vehículo: de ahí salen los datos «en tarjeta».
  campos: readonly CampoDeVehiculo[]
  fase: { nombre: string; color: string } | null
  // Abre el vehículo (un clic en cualquier parte de la tarjeta, o Enter sobre su nombre).
  alAbrir: () => void
  // Su resumen está abierto: la tarjeta se marca.
  abierta?: boolean
  // Lo que se puede hacer con él (editar), en la esquina.
  acciones?: ReactNode
  // Lo que va al lado de la fase (si está en la vitrina).
  insignias?: ReactNode
  // La casilla para elegirlo, delante de la foto.
  seleccion?: ReactNode
  // El precio, o la puja con su rótulo en un origen de subasta (`precioDeLaFila`).
  precio: PrecioDeLaFila | null
  // En escritorio, con las tarjetas elegidas: la foto arriba, a todo el ancho y con su carrusel.
  grande?: boolean
}

// Un vehículo en una tarjeta de la lista (`@/shared/ui/lista`): lo que se ve en el celular en vez de la fila de la tabla.
export function TarjetaVehiculo(props: Props) {
  const { vehiculo, campos, fase, alAbrir, abierta, acciones, insignias, seleccion, precio } = props
  const grande = props.grande ?? false
  const identidad = useIdentidad(campos)(vehiculo)
  const datos = camposDeTarjeta(campos).filter((campo) => {
    const valor = vehiculo.atributos[campo.clave]
    return valor !== undefined && valor !== null && valor !== ''
  })
  return (
    <TarjetaDeLista alAbrir={alAbrir} abierta={abierta ?? false} acciones={acciones}>
      {/* Con el texto al 200 % la tarjeta mide menos de 16 rem: la miniatura (rem) y el título no caben en una fila y se apilan. */}
      {/* Grande, la foto va arriba a todo el ancho (con flechas: ahí caben) y la casilla, sobre su esquina. */}
      <div className={cn('flex items-start gap-3 @max-[16rem]:flex-col', grande && 'flex-col')}>
        {grande ? (
          <div className="relative w-full">
            <FotosEnElLugar vehiculo={vehiculo} modo="carrusel" className="w-full" />
            {seleccion ? (
              <div className="absolute top-1 left-1 rounded-(--radius-sm) bg-(--color-surface)">
                {seleccion}
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {seleccion}
            <FotosEnElLugar vehiculo={vehiculo} modo="abrir" className="w-20" />
          </>
        )}
        <div className={cn('grid min-w-0 flex-1 gap-1 @max-[16rem]:flex-none', grande && 'w-full')}>
          <h3 className="text-(length:--text-base) font-medium [overflow-wrap:anywhere] text-(--color-ink)">
            <AbrirResumen nombre={identidad.nombre}>{identidad.nombre}</AbrirResumen>
          </h3>
          <p className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums">
            {identidad.titulo === null ? '' : `${identidad.titulo} · `}#{vehiculo.numero}
            {vehiculo.anio ? ` · ${String(vehiculo.anio)}` : ''}
            {vehiculo.vin ? ` · ${vehiculo.vin}` : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <BadgeDeFase fase={fase} />
            {insignias}
            <PrecioDeTarjeta precio={precio} />
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
    </TarjetaDeLista>
  )
}
