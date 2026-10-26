'use client'

import { itemSeDibuja, type ContextoDeHoja } from '../../../entities/binding'
import type { SeccionDeHoja as Seccion } from '../../../entities/hoja'
import type { AccionesDeHoja } from '../hooks/use-hoja'
import { ItemDeHoja } from './item-de-hoja'

type Props = { seccion: Seccion; contexto: ContextoDeHoja; acciones: AccionesDeHoja }

// Una sección de la hoja, con su título y sus ítems en el orden declarado. Es su propio contenedor (`@container`): el ancho de sus celdas depende del ancho de la
// sección y no del de la pantalla, así el texto al 200 % colapsa solo a una columna.
export function SeccionDeHoja({ seccion, contexto, acciones }: Props) {
  return (
    <section
      data-seccion={seccion.id}
      aria-label={seccion.titulo ?? undefined}
      className="@container grid min-w-0 content-start gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4"
    >
      {seccion.titulo === null ? null : (
        <h2 className="text-(length:--text-base) font-semibold text-(--color-ink)">
          {seccion.titulo}
        </h2>
      )}
      <div className="grid grid-cols-12 gap-3">
        {seccion.items
          .filter((item) => itemSeDibuja(item, contexto))
          .map((item, posicion) => (
            <ItemDeHoja
              key={`${item.tipo}:${item.nodo}:${posicion}`}
              item={item}
              contexto={contexto}
              acciones={acciones}
            />
          ))}
      </div>
    </section>
  )
}
