'use client'

import type { BloqueDeCotizacion, LineaCalculada } from '../../../entities/cotizador/formula'
import type {
  ItemParaCotizar,
  LineaEditable as Linea,
} from '../../../entities/cotizador/hoja-editable'
import { AgregarLinea } from './agregar-linea'
import { LineaEditable, type AccionesDeLinea } from './linea-editable'

type Props = {
  bloque: BloqueDeCotizacion
  titulo: string
  lineas: readonly Linea[]
  calculadas: Readonly<Record<string, LineaCalculada>>
  moneda: string
  cajas: readonly string[]
  items: readonly ItemParaCotizar[]
  errores: Readonly<Record<string, string>>
  bloqueada: string | undefined
  motivoParaNoAgregar: string | undefined
  acciones: AccionesDeLinea & {
    agregar: (bloque: BloqueDeCotizacion, item?: ItemParaCotizar) => void
  }
}

// Un bloque de la hoja editable (8.12-4, C10–C11): una lista (no una tabla: cada línea es una tarjeta que se apila en el celular) y cómo agregar.
export function BloqueEditable({
  bloque,
  titulo,
  lineas,
  calculadas,
  moneda,
  cajas,
  items,
  errores,
  bloqueada,
  motivoParaNoAgregar,
  acciones,
}: Props) {
  const id = `bloque-${bloque}`
  return (
    <section aria-labelledby={id} className="grid gap-2">
      <h2 id={id} className="text-(length:--text-lg) font-semibold">
        {titulo}
      </h2>
      {lineas.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Sin líneas en este bloque.
        </p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2" aria-label={`Líneas de ${titulo}`}>
          {lineas.map((l, i) => (
            <LineaEditable
              key={l.id}
              linea={l}
              calculada={calculadas[l.id]}
              nombre={`Línea ${String(i + 1)} de ${titulo}`}
              moneda={moneda}
              cajas={cajas}
              errores={errores}
              bloqueada={bloqueada}
              acciones={acciones}
            />
          ))}
        </ul>
      )}
      <AgregarLinea
        bloque={bloque}
        titulo={titulo}
        items={items}
        motivo={motivoParaNoAgregar}
        alAgregar={acciones.agregar}
      />
    </section>
  )
}
