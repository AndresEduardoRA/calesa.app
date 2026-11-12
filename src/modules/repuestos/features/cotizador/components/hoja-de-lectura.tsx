'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { formatearFecha } from '@/shared/lib/fechas'
import { formatearNumero, formatearPorcentaje } from '@/shared/lib/formato'
import { RUTAS } from '@/shared/lib/rutas'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import {
  lineasPorBloque,
  type CotizacionConLineas,
  type CotizacionLeida,
} from '../../../entities/cotizador/hoja-de-lectura'
import { EstadoDeCotizacion } from './estado-de-cotizacion'
import { LineasDelBloque } from './lineas-del-bloque'

type Props = CotizacionConLineas & { proyecto: { id: string; numero: number } }

function ConfiguracionUsada({ cotizacion }: { cotizacion: CotizacionLeida }) {
  const { locale, zonaHoraria } = useRegional()
  if (!cotizacion.snapshot.ok) {
    // Las viejas sin snapshot v1 quedaron anuladas (D15): a ésas no se les pide anular.
    return (
      <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
        {cotizacion.estado === 'borrador'
          ? 'Esta cotización no tiene una configuración válida: anúlala y crea otra.'
          : 'Esta cotización no tiene una configuración válida.'}
      </p>
    )
  }
  const { config } = cotizacion.snapshot.snapshot
  return (
    <section aria-labelledby="configuracion-usada" className="grid gap-1">
      <h2 id="configuracion-usada" className="text-(length:--text-sm) font-medium">
        Configuración con que se calculó
      </h2>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-(length:--text-sm)">
        <div className="flex gap-1">
          <dt className="text-(--color-ink-faint)">Factor importado</dt>
          <dd>{formatearNumero(Number(config.factor_importado), { locale, decimales: 4 })}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-(--color-ink-faint)">Recargo local</dt>
          <dd>{formatearPorcentaje(Number(config.recargo_local), { locale, decimales: 2 })}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-(--color-ink-faint)">Redondeo</dt>
          <dd>
            <Monto valor={Number(config.redondeo)} moneda={cotizacion.moneda} />
          </dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-(--color-ink-faint)">Vigente desde</dt>
          <dd>{formatearFecha(config.vigente_desde, { zona: zonaHoraria })}</dd>
        </div>
      </dl>
    </section>
  )
}

// La hoja de una cotización de repuestos en sólo lectura (8.12-3, C13): cabecera, la configuración con que se calculó (D37), los bloques «Importado» y
// «Local» y el total que guardó la base (D36: nada se recalcula; nulo es «Sin total»). Nada se edita: la hoja editable, aceptar y anular llegan con 8.12-4.
export function HojaDeLectura({ cotizacion, lineas, proyecto }: Props) {
  const { zonaHoraria } = useRegional()
  const { importado, local } = lineasPorBloque(lineas)
  const volver = `${RUTAS.repuestos}/${proyecto.id}?pestana=cotizaciones`
  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <Link
          href={volver as Route}
          className="w-fit text-(length:--text-sm) underline-offset-2 hover:underline"
        >
          Volver al proyecto
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-(length:--text-xl) font-semibold">
            Cotización #{String(cotizacion.numero)}
          </h1>
          <EstadoDeCotizacion estado={cotizacion.estado} />
        </div>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Proyecto #{String(proyecto.numero)} · {cotizacion.moneda} · Creada el{' '}
          {formatearFecha(cotizacion.creadoEn, { zona: zonaHoraria })}
          {cotizacion.aceptadaEn
            ? ` · Aceptada el ${formatearFecha(cotizacion.aceptadaEn, { zona: zonaHoraria })}`
            : null}
        </p>
      </header>
      <ConfiguracionUsada cotizacion={cotizacion} />
      <LineasDelBloque
        id="bloque-importado"
        titulo="Importado"
        lineas={importado}
        moneda={cotizacion.moneda}
      />
      <LineasDelBloque id="bloque-local" titulo="Local" lineas={local} moneda={cotizacion.moneda} />
      <footer className="grid gap-2 border-t border-(--color-line) pt-3">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold">Total</span>
          {cotizacion.total === null ? (
            <span className="text-(--color-ink-soft)">Sin total</span>
          ) : (
            <Monto
              valor={Number(cotizacion.total)}
              moneda={cotizacion.moneda}
              className="font-semibold"
            />
          )}
        </p>
        {cotizacion.notas ? (
          <p className="text-(length:--text-sm) whitespace-pre-line text-(--color-ink-soft)">
            {cotizacion.notas}
          </p>
        ) : null}
      </footer>
    </div>
  )
}
