import { cn } from 'cn'
import { Monto } from '@/shared/ui/monto'
import type { GrupoDeTarjeta } from '../../../entities/tarjeta/modelo-de-la-tarjeta'

const SIN_DATO = '—'

// Una celda combinada (tipo de cambio o plazo): una vez por grupo, no por fila. Desde 36 rem del contenedor de la tarjeta ocupa el alto de las filas del grupo; debajo, va bajo
// el título. Lleva su `data-` para el e2e.
function CeldaCombinada({
  etiqueta,
  valor,
  marca,
  orden,
}: {
  etiqueta: string
  valor: string | null
  marca: 'data-tipo-de-cambio' | 'data-plazo'
  orden: string
}) {
  return (
    <div
      {...{ [marca]: '' }}
      className={cn(
        'flex min-w-0 flex-col justify-center gap-0.5 rounded-(--radius-control) border border-(--tono-borde,var(--color-line)) px-3 py-2 text-(length:--text-sm)',
        orden,
      )}
    >
      <span className="text-(length:--text-xs) text-(--tono-tinta,var(--color-ink-soft))">
        {etiqueta}
      </span>
      <span className="font-medium [overflow-wrap:anywhere] text-(--tono-tinta,var(--color-ink))">
        {valor ?? SIN_DATO}
      </span>
    </div>
  )
}

// Un grupo de la tarjeta: su título y su tono (`data-tono`, el que escribe `<EstiloDeTonos>`), las filas en el orden de la lectura y, a un lado, el tipo de cambio y el plazo.
export function GrupoDeLaTarjeta({ grupo }: { grupo: GrupoDeTarjeta }) {
  return (
    <section
      data-grupo-de-la-tarjeta={grupo.id}
      {...(grupo.tono === null ? {} : { 'data-tono': grupo.tono })}
      aria-label={grupo.etiqueta}
      className="grid min-w-0 gap-2 rounded-(--radius-card) border border-(--tono-borde,var(--color-line-strong)) bg-(--tono-fondo,var(--color-surface)) p-3 text-(--tono-tinta,var(--color-ink))"
    >
      <h3 className="text-(length:--text-sm) font-semibold [overflow-wrap:anywhere]">
        {grupo.etiqueta}
      </h3>
      <div className="grid min-w-0 gap-2 @2xl/tarjeta:grid-flow-col @2xl/tarjeta:grid-cols-[minmax(0,1fr)_auto_auto]">
        <ul className="order-3 grid min-w-0 gap-1 @2xl/tarjeta:order-1">
          {grupo.filas.map((fila) => (
            <li
              key={fila.nodo}
              data-fila-de-la-tarjeta={fila.nodo}
              className="flex flex-wrap items-baseline justify-between gap-x-4 text-(length:--text-sm)"
            >
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {fila.etiqueta}
                {fila.leyenda === null ? null : (
                  <span className="block text-(length:--text-xs) opacity-80">{fila.leyenda}</span>
                )}
              </span>
              {fila.usd === null ? (
                SIN_DATO
              ) : (
                <Monto valor={fila.usd} moneda="USD" className="font-medium" />
              )}
            </li>
          ))}
        </ul>
        {grupo.tipoDeCambio === null ? null : (
          <CeldaCombinada
            etiqueta="Tipo de cambio"
            valor={grupo.tipoDeCambio.valor}
            marca="data-tipo-de-cambio"
            orden="order-1 @2xl/tarjeta:order-2 @2xl/tarjeta:min-w-40"
          />
        )}
        {grupo.plazo === null ? null : (
          <CeldaCombinada
            etiqueta="Plazo"
            valor={grupo.plazo.valor}
            marca="data-plazo"
            orden="order-2 @2xl/tarjeta:order-3 @2xl/tarjeta:min-w-32"
          />
        )}
      </div>
    </section>
  )
}
