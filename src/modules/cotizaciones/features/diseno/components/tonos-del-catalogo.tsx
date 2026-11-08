'use client'

import { SwatchBookIcon } from 'lucide-react'
import { EstadoVacio } from '@/shared/ui/estados'
import type { ListaDeTonos } from '../../../entities/diseno/tonos'
import { FilaDeTono } from './fila-de-tono'

type Props = { lista: ListaDeTonos }

// Configuración › Cotización › Tonos (4.22-4): el catálogo de la empresa, por nombre. Es de toda la empresa, no de un origen; la lista llega leída en el servidor
// (decenas de filas como mucho: la base pone el tope).
export function TonosDelCatalogo({ lista }: Props) {
  return (
    <section className="grid gap-3" aria-labelledby="titulo-de-tonos">
      <div className="grid gap-0.5">
        <h2
          id="titulo-de-tonos"
          className="text-(length:--text-lg) font-semibold text-(--color-ink)"
        >
          Tonos
        </h2>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Los colores con que se pintan los grupos de una fórmula. Cada tono se lee en el tema claro
          y en el oscuro.
        </p>
      </div>
      {lista.tonos.length === 0 ? (
        <EstadoVacio
          Icono={SwatchBookIcon}
          titulo="Todavía no hay tonos. Crea el primero."
          compacto
        />
      ) : (
        <ul className="grid gap-2">
          {lista.tonos.map((tono) => (
            <FilaDeTono key={tono.id} tono={tono} />
          ))}
        </ul>
      )}
    </section>
  )
}
