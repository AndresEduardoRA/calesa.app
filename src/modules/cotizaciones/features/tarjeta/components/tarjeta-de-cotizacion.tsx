import { Badge } from '@/shared/ui/badge'
import { Marca } from '@/shared/ui/marca'
import { Monto } from '@/shared/ui/monto'
import type { ModeloDeTarjeta } from '../../../entities/tarjeta/modelo-de-la-tarjeta'
import { GrupoDeLaTarjeta } from './grupo-de-la-tarjeta'

function Encabezado({ modelo }: { modelo: ModeloDeTarjeta }) {
  const e = modelo.encabezado
  return (
    <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div className="grid min-w-0 gap-0.5">
        {e.titulo === null ? null : (
          <h2 data-titulo-de-la-tarjeta="" className="text-(length:--text-lg) font-semibold">
            {e.titulo}
          </h2>
        )}
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          <span data-fecha-de-la-tarjeta="">{e.fecha}</span>
          {e.numero === null ? null : <span> · Cotización n.º {e.numero}</span>}
          {e.vencida ? (
            <Badge variant="destructive" className="ml-2">
              Vencida
            </Badge>
          ) : null}
        </p>
        {e.asesor === null ? null : (
          <p
            data-asesor-de-la-tarjeta=""
            className="text-(length:--text-sm) text-(--color-ink-soft)"
          >
            Asesor: {e.asesor}
          </p>
        )}
      </div>
      {modelo.logo === null ? null : (
        <Marca nombre={modelo.logo.nombre} logoUrl={modelo.logo.url} />
      )}
    </header>
  )
}

function Total({ modelo }: { modelo: ModeloDeTarjeta }) {
  const { total, aparte } = modelo
  return (
    <div
      data-total-de-la-tarjeta=""
      className="grid gap-1 rounded-(--radius-card) border border-(--color-line-strong) bg-(--color-surface-sunken) p-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <span className="text-(length:--text-sm) font-semibold [overflow-wrap:anywhere]">
          {total.etiqueta}
        </span>
        <strong data-total-usd="" className="text-(length:--text-xl) font-semibold">
          {total.usd === null ? '—' : <Monto valor={total.usd} moneda="USD" />}
        </strong>
      </div>
      {total.leyenda === null ? null : (
        <p className="text-(length:--text-xs) text-(--color-ink-soft)">{total.leyenda}</p>
      )}
      {total.bs === null ? null : (
        <p data-total-bs-de-la-tarjeta="" className="text-(length:--text-sm)">
          <Monto valor={total.bs.valor} moneda={total.bs.moneda} className="font-medium" />
        </p>
      )}
      {aparte.length === 0 ? null : (
        <ul className="grid gap-1 border-t border-(--color-line) pt-2">
          {aparte.map((a) => (
            <li
              key={a.nodo}
              data-aparte-de-la-tarjeta={a.nodo}
              className="flex flex-wrap items-baseline justify-between gap-x-4 text-(length:--text-sm) text-(--color-ink-soft)"
            >
              <span className="[overflow-wrap:anywhere]">{a.etiqueta}</span>
              <Monto valor={a.usd} moneda="USD" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// La tarjeta de una cotización: lo que el cliente ve. Dibuja un `ModeloDeTarjeta` y nada más (no lee, no calcula); todo monto pasa por `<Monto>` (Modo Live). `@container` para que
// las celdas combinadas se acomoden por el ancho de la tarjeta y no por el de la ventana.
export function TarjetaDeCotizacion({ modelo }: { modelo: ModeloDeTarjeta }) {
  return (
    <article
      data-tarjeta-de-cotizacion=""
      {...(modelo.porOmision ? { 'data-por-omision': '' } : {})}
      className="@container/tarjeta grid min-w-0 gap-3 rounded-(--radius-card) border border-(--color-line-strong) bg-(--color-surface) p-4"
    >
      <Encabezado modelo={modelo} />
      {modelo.vehiculo === null ? null : (
        <p
          data-vehiculo-de-la-tarjeta=""
          className="rounded-(--radius-control) bg-(--color-surface-sunken) px-3 py-2 text-(length:--text-sm) font-medium [overflow-wrap:anywhere]"
        >
          {modelo.vehiculo}
        </p>
      )}
      {modelo.grupos.map((grupo) => (
        <GrupoDeLaTarjeta key={grupo.id} grupo={grupo} />
      ))}
      <Total modelo={modelo} />
      {modelo.nota === null ? null : (
        <p data-nota-de-la-tarjeta="" className="text-(length:--text-xs) text-(--color-ink-soft)">
          {modelo.nota}
        </p>
      )}
    </article>
  )
}
