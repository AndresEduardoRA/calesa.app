'use client'

import { Checkbox } from '@/shared/ui/checkbox'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { Diseno } from '../../../entities/diseno'
import type { NodoDeLaTarjeta } from '../../../entities/diseno/edicion-de-la-tarjeta'
import type { EdicionesDelDiseno } from '../hooks/use-ediciones-del-diseno'

type Props = {
  tarjeta: Diseno['tarjeta_total']
  // Los nodos con `salida: 'total'` y con `salida: 'aparte'` de la fórmula, en su orden.
  totales: readonly NodoDeLaTarjeta[]
  apartes: readonly NodoDeLaTarjeta[]
  etiquetas: ReadonlyMap<string, string>
  ediciones: EdicionesDelDiseno
  ocupado: boolean
}

// La tarjeta del total: qué nodo es el total y qué se muestra junto a él. Un secundario elegido que ya no es «aparte» (un diseño viejo) se muestra igual, para poder quitarlo.
export function TarjetaDelDiseno({
  tarjeta,
  totales,
  apartes,
  etiquetas,
  ediciones,
  ocupado,
}: Props) {
  const totalesConActual = totales.some((t) => t.id === tarjeta.nodo)
    ? totales
    : [...totales, { id: tarjeta.nodo, etiqueta: etiquetas.get(tarjeta.nodo) ?? tarjeta.nodo }]
  const visibles = [
    ...apartes,
    ...tarjeta.secundarios
      .filter((s) => !apartes.some((a) => a.id === s))
      .map((s) => ({ id: s, etiqueta: etiquetas.get(s) ?? s })),
  ]
  return (
    <section
      className="@container grid min-w-0 gap-3 rounded-(--radius-lg) border border-(--color-line-strong) p-3"
      data-tarjeta-del-diseno
      aria-labelledby="tarjeta-del-diseno"
    >
      <h3
        id="tarjeta-del-diseno"
        className="text-(length:--text-base) font-medium text-(--color-ink)"
      >
        Tarjeta del total
      </h3>
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        Lo que muestra la tarjeta del resumen y el PDF. Repite lo que la hoja ya dibuja.
      </p>
      <CampoSeleccion
        nombre="tarjeta-total"
        etiqueta="Total"
        opciones={totalesConActual.map((t) => ({ valor: t.id, etiqueta: t.etiqueta }))}
        value={tarjeta.nodo}
        disabled={ocupado || totalesConActual.length < 2}
        onChange={(evento) => {
          ediciones.ponerTotal(evento.target.value)
        }}
      />
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
        {visibles.map((nodo) => (
          <li key={nodo.id} className="min-w-0" data-secundario={nodo.id}>
            <label className="flex min-w-0 items-center gap-2 text-(length:--text-sm) break-words text-(--color-ink)">
              <Checkbox
                aria-label={`Mostrar «${nodo.etiqueta}» junto al total`}
                checked={tarjeta.secundarios.includes(nodo.id)}
                disabled={ocupado}
                onCheckedChange={() => {
                  ediciones.alternarSecundario(nodo.id)
                }}
              />
              {`Mostrar «${nodo.etiqueta}» junto al total`}
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
