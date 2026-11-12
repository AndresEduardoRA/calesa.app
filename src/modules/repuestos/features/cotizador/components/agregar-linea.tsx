'use client'

import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import type { BloqueDeCotizacion } from '../../../entities/cotizador/formula'
import type { ItemParaCotizar } from '../../../entities/cotizador/hoja-editable'

type Props = {
  bloque: BloqueDeCotizacion
  titulo: string
  items: readonly ItemParaCotizar[]
  // Por qué no se puede agregar (el tope de líneas, guardando); nada si se puede.
  motivo: string | undefined
  alAgregar: (bloque: BloqueDeCotizacion, item?: ItemParaCotizar) => void
}

const SIN_ITEMS = 'No quedan ítems del proyecto sin cotizar.'

// Agregar una línea a un bloque (8.12-4, C11): libre, o desde un ítem del proyecto que todavía no está en otra línea (la base rechaza un ítem repetido).
export function AgregarLinea({ bloque, titulo, items, motivo, alAgregar }: Props) {
  const [elegido, setElegido] = useState('')
  const item = items.find((i) => i.id === elegido) ?? items[0]
  const nombre = `agregar-item-${bloque}`
  const motivoDelItem = motivo ?? (items.length === 0 ? SIN_ITEMS : undefined)
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={motivo !== undefined}
          onClick={() => {
            alAgregar(bloque)
          }}
        >
          Agregar línea
        </Button>
        <label htmlFor={nombre} className="sr-only">
          Ítem para {titulo}
        </label>
        <select
          id={nombre}
          value={item?.id ?? ''}
          disabled={motivoDelItem !== undefined}
          className="h-11 max-w-full min-w-0 rounded-lg border border-(--color-line-strong) bg-(--color-surface) px-2 text-(length:--text-sm) disabled:opacity-50 md:h-9"
          onChange={(evento) => {
            setElegido(evento.target.value)
          }}
        >
          {items.length === 0 ? <option value="">Sin ítems</option> : null}
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.descripcion}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={motivoDelItem !== undefined || !item}
          onClick={() => {
            if (item) alAgregar(bloque, item)
          }}
        >
          Agregar desde un ítem
        </Button>
      </div>
      {motivoDelItem ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{motivoDelItem}</p>
      ) : null}
    </div>
  )
}
