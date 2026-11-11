import Link from 'next/link'
import type { Route } from 'next'
import type { ReactNode } from 'react'

export type FilaDeBloque = {
  id: string
  texto: string
  // Una línea chica bajo el texto: la hora, hace cuánto.
  detalle?: ReactNode
  // Sin ruta la fila se dibuja como texto.
  ruta?: string | null
}

// Las filas de un bloque y, debajo, cuántas hay en frase («3 recordatorios», «más de 5 recordatorios»).
export function ListaDeBloque({ filas, conteo }: { filas: FilaDeBloque[]; conteo: string }) {
  return (
    <div className="grid">
      <ul className="divide-y divide-(--color-line)">
        {filas.map((fila) => {
          const contenido = (
            <>
              <span className="block truncate text-(length:--text-sm) text-(--color-ink)">
                {fila.texto}
              </span>
              {fila.detalle ? (
                <span className="block text-(length:--text-xs) text-(--color-ink-soft)">
                  {fila.detalle}
                </span>
              ) : null}
            </>
          )
          return (
            <li key={fila.id}>
              {fila.ruta ? (
                <Link
                  href={fila.ruta as Route}
                  className="block px-4 py-2.5 hover:bg-(--color-surface-muted) focus-visible:bg-(--color-surface-muted)"
                >
                  {contenido}
                </Link>
              ) : (
                <div className="px-4 py-2.5">{contenido}</div>
              )}
            </li>
          )
        })}
      </ul>
      <p className="border-t border-(--color-line) px-4 py-2 text-(length:--text-xs) text-(--color-ink-soft)">
        {conteo}
      </p>
    </div>
  )
}
