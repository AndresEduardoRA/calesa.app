'use client'

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

type Pestana<C extends string> = { clave: C; titulo: string }

type Props<C extends string> = {
  // Qué agrupan: «Secciones del lead». Es el nombre accesible de la lista de pestañas.
  etiqueta: string
  pestanas: readonly Pestana<C>[]
  activa: C
  alElegir: (clave: C) => void
  // Lo de la pestaña elegida: sólo se dibuja ésa, y cada una lee y carga lo suyo al elegirse.
  children: ReactNode
}

// Flechas, Inicio y Fin recorren las pestañas (patrón «tabs» de WAI-ARIA): la pestaña elegida es la única parada de Tab, y moverse
// la elige.
function destinoDe<C extends string>(
  pestanas: readonly Pestana<C>[],
  actual: C,
  tecla: string,
): C | null {
  const i = pestanas.findIndex((p) => p.clave === actual)
  const n = pestanas.length
  const destino: Record<string, number> = {
    ArrowRight: (i + 1) % n,
    ArrowLeft: (i - 1 + n) % n,
    Home: 0,
    End: n - 1,
  }
  const j = destino[tecla]
  return j === undefined ? null : (pestanas[j]?.clave ?? null)
}

// Las pestañas de un resumen (`?pestana=`), sin números: contar crece con el total. Una lista de pestañas propia: la de Base UI sumaba
// su peso a la carga del listado. 44 px de alto en el celular.
export function PestanasDelResumen<C extends string>({
  etiqueta,
  pestanas,
  activa,
  alElegir,
  children,
}: Props<C>) {
  const id = useId()
  const lista = useRef<HTMLDivElement>(null)
  const alPulsar = (evento: KeyboardEvent) => {
    const destino = destinoDe(pestanas, activa, evento.key)
    if (destino === null) {
      return
    }
    evento.preventDefault()
    alElegir(destino)
    lista.current?.querySelector<HTMLElement>(`[data-pestana="${destino}"]`)?.focus()
  }
  return (
    <div className="grid gap-4">
      <div
        ref={lista}
        role="tablist"
        aria-label={etiqueta}
        onKeyDown={alPulsar}
        className="bg-muted text-muted-foreground inline-flex w-full items-center rounded-lg p-[3px] md:h-8 md:w-fit"
      >
        {pestanas.map((p) => {
          const elegida = p.clave === activa
          return (
            <button
              key={p.clave}
              type="button"
              role="tab"
              id={`${id}-${p.clave}`}
              data-pestana={p.clave}
              aria-selected={elegida}
              aria-controls={`${id}-panel`}
              tabIndex={elegida ? 0 : -1}
              onClick={() => {
                alElegir(p.clave)
              }}
              className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-md px-3 text-(length:--text-sm) font-medium outline-none focus-visible:shadow-(--shadow-focus) md:h-full md:min-h-0 md:flex-none ${
                elegida ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'
              }`}
            >
              {p.titulo}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${activa}`}>
        {children}
      </div>
    </div>
  )
}
