'use client'

import type { ReactNode } from 'react'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import type { ContextoDeLaHoja } from './contexto-de-la-hoja'
import { controlesDeItem } from './controles-de-item'

type Props = {
  filas: readonly FilaDeItem[]
  contexto: ContextoDeLaHoja
  filaNueva: ReactNode
}

function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1">
      <span className="text-(length:--text-xs) text-(--color-ink-soft)">{etiqueta}</span>
      {children}
    </div>
  )
}

// La hoja en el celular (8.09-2, C8): una tarjeta por ítem con los mismos controles de la fila de la tabla, uno bajo otro; la fase, «Imágenes» y «Eliminar» al pie. Nada ensancha la página: `min-w-0` en cada hijo.
export function TarjetasDeItems({ filas, contexto, filaNueva }: Props) {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {filas.map((fila) => {
        const c = controlesDeItem(fila, contexto)
        return (
          <li
            key={fila.id}
            data-fila-de-item={fila.id}
            className="grid min-w-0 gap-3 rounded-(--radius-md) border border-(--color-border) p-3"
          >
            <Campo etiqueta="Descripción">{c.descripcion}</Campo>
            <div className="@container grid min-w-0 grid-cols-1 gap-3 min-[24rem]:grid-cols-2">
              <Campo etiqueta="Tipo de pieza">{c.tipoDePieza}</Campo>
              <Campo etiqueta="Condición">{c.condicion}</Campo>
              <Campo etiqueta="País">{c.pais}</Campo>
              <Campo etiqueta="Vía">{c.via}</Campo>
              <Campo etiqueta="Cantidad">{c.cantidad}</Campo>
              <Campo etiqueta="Precio al cliente">{c.precio}</Campo>
              <Campo etiqueta="Moneda">{c.moneda}</Campo>
              <Campo etiqueta="Tracking">{c.tracking}</Campo>
            </div>
            <Campo etiqueta="Notas">{c.notas}</Campo>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {c.fase}
              <div className="flex flex-wrap gap-1">
                {c.imagenes}
                {c.hueco}
                {c.eliminar}
              </div>
            </div>
          </li>
        )
      })}
      {filaNueva ? (
        <li data-fila-de-item="nueva" className="min-w-0">
          {filaNueva}
        </li>
      ) : null}
    </ul>
  )
}
