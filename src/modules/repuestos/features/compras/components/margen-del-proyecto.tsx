'use client'

import { Monto } from '@/shared/ui/monto'
import {
  textoSinPrecio,
  type MargenDelProyecto as Margen,
  type MargenEnMoneda,
} from '../../../entities/compras/margen'

// El margen de un proyecto (8.11-2, C8), por moneda: precios de los ítems, compras y margen, tal como los da la base. **Nulo no es 0:** con ítems
// sin precio no hay monto de margen sino «Sin precio en N ítems»; un margen 0 se dibuja como monto. El Modo Live oculta los montos (`<Monto>`).
export function MargenDelProyecto({ margen }: { margen: Margen }) {
  return (
    <section aria-labelledby="margen-del-proyecto" className="grid gap-2">
      <h2 id="margen-del-proyecto" className="text-(length:--text-lg) font-semibold">
        Margen del proyecto
      </h2>
      {margen.monedas.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Todavía no hay precios ni compras.
        </p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {margen.monedas.map((m) => (
            <EnMoneda key={m.moneda} m={m} margen={margen} />
          ))}
        </ul>
      )}
    </section>
  )
}

function EnMoneda({ m, margen }: { m: MargenEnMoneda; margen: Margen }) {
  return (
    <li className="min-w-0 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3">
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-x-4 gap-y-2 text-(length:--text-sm)">
        <div className="min-w-0">
          <dt className="text-(--color-ink-soft)">Precios</dt>
          <dd>
            <Monto valor={m.precios} moneda={m.moneda} />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-(--color-ink-soft)">Compras</dt>
          <dd>
            <Monto valor={m.compras} moneda={m.moneda} />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-(--color-ink-soft)">Margen</dt>
          <dd className="font-medium break-words">
            {m.margen === null ? (
              textoSinPrecio(margen.sinPrecio)
            ) : (
              <Monto valor={m.margen} moneda={m.moneda} />
            )}
          </dd>
        </div>
      </dl>
    </li>
  )
}
