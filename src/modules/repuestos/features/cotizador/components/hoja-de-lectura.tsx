'use client'

import { Monto } from '@/shared/ui/monto'
import {
  lineasPorBloque,
  type CotizacionConLineas,
} from '../../../entities/cotizador/hoja-de-lectura'
import { CabeceraDeCotizacion } from './cabecera-de-cotizacion'
import { ConfiguracionUsada } from './configuracion-usada'
import { LineasDelBloque } from './lineas-del-bloque'

type Props = CotizacionConLineas & {
  proyecto: { id: string; numero: number }
  // «Anular» de una borrador o aceptada con el proyecto abierto (8.12-4, D48).
  acciones?: React.ReactNode
  // Por qué una borrador se ve en sólo lectura (el proyecto cerrado).
  nota?: string
}

// La hoja de una cotización de repuestos en sólo lectura (8.12-3, C13): cabecera, la configuración con que se calculó (D37), los bloques «Importado» y
// «Local» y el total que guardó la base (D36: nada se recalcula; nulo es «Sin total»). Es la de una aceptada, una anulada o una borrador que no se puede
// editar (8.12-4, D41); la editable es `hoja-editable.tsx`.
export function HojaDeLectura({ cotizacion, lineas, proyecto, acciones, nota }: Props) {
  const { importado, local } = lineasPorBloque(lineas)
  return (
    <div className="grid gap-6">
      <CabeceraDeCotizacion cotizacion={cotizacion} proyecto={proyecto} acciones={acciones} />
      {nota ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          {nota}
        </p>
      ) : null}
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
