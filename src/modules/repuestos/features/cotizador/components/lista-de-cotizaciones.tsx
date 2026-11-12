'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { textoDelTope } from '@/shared/lib/conteo'
import { formatearFecha } from '@/shared/lib/fechas'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoVacio } from '@/shared/ui/estados'
import { AbrirResumen, TarjetaDeLista } from '@/shared/ui/lista'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import {
  TOPE_DE_COTIZACIONES,
  rutaDeLaCotizacion,
  type FilaDeCotizacion,
} from '../../../entities/cotizador/cotizacion'
import { EstadoDeCotizacion } from './estado-de-cotizacion'

type Props = { proyectoId: string; filas: readonly FilaDeCotizacion[]; hayMas: boolean }

// Las cotizaciones de un proyecto (8.12-3, C11), de la más nueva: número, estado, el total que guardó la base (nulo es «Sin total», nunca 0) y la fecha.
// Tocar una abre su hoja. Una columna `minmax(0, 1fr)`: con el texto al 200 % nada ensancha la página.
export function ListaDeCotizaciones({ proyectoId, filas, hayMas }: Props) {
  const router = useRouter()
  const { zonaHoraria } = useRegional()
  if (filas.length === 0) {
    return <EstadoVacio titulo="Todavía no hay cotizaciones en este proyecto." compacto />
  }
  return (
    <div className="grid gap-2">
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2" aria-label="Cotizaciones del proyecto">
        {filas.map((c) => {
          const titulo = `Cotización #${String(c.numero)}`
          return (
            <TarjetaDeLista
              key={c.id}
              alAbrir={() => {
                router.push(rutaDeLaCotizacion(proyectoId, c.id) as Route)
              }}
            >
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <AbrirResumen nombre={titulo} className="min-w-0 font-medium break-words">
                  {titulo}
                </AbrirResumen>
                <EstadoDeCotizacion estado={c.estado} />
              </div>
              <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-(length:--text-sm)">
                {c.total === null ? (
                  <span className="text-(--color-ink-soft)">Sin total</span>
                ) : (
                  <Monto valor={Number(c.total)} moneda={c.moneda} className="font-medium" />
                )}
              </p>
              <p className="min-w-0 text-(length:--text-sm) break-words text-(--color-ink-soft)">
                Creada el {formatearFecha(c.creadoEn, { zona: zonaHoraria })}
                {c.aceptadaEn
                  ? ` · Aceptada el ${formatearFecha(c.aceptadaEn, { zona: zonaHoraria })}`
                  : null}
              </p>
            </TarjetaDeLista>
          )
        })}
      </ul>
      {hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_COTIZACIONES, {
            sustantivo: 'cotizaciones',
            articulo: 'las',
          })}
        />
      ) : null}
    </div>
  )
}
