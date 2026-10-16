'use client'

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { PESTANAS_DEL_RAPIDO, type PestanaDelRapido } from '../../../entities/rapido'
import { SeguimientosDelRapidoDiferido } from './diferidos'

type Props = {
  leadId: string
  pestana: PestanaDelRapido
  alElegir: (pestana: PestanaDelRapido) => void
  resumen: ReactNode
}

// Flechas, Inicio y Fin recorren las pestañas (patrón «tabs» de WAI-ARIA): la pestaña elegida es la
// única parada de Tab, y moverse la elige.
function siguiente(actual: PestanaDelRapido, tecla: string): PestanaDelRapido | null {
  const claves = PESTANAS_DEL_RAPIDO.map((p) => p.clave)
  const i = claves.indexOf(actual)
  const destino: Record<string, number> = {
    ArrowRight: (i + 1) % claves.length,
    ArrowLeft: (i - 1 + claves.length) % claves.length,
    Home: 0,
    End: claves.length - 1,
  }
  const j = destino[tecla]
  return j === undefined ? null : (claves[j] ?? null)
}

// «Resumen» y «Seguimientos» (`?pestana=seguimientos`), sin números: el de «Seguimientos» insinuaría
// los privados de otros. Sólo se dibuja la pestaña elegida: «Seguimientos» se lee al abrirla. Una
// lista de pestañas propia (como la del embudo): la de Base UI sumaba su peso a la carga del listado.
export function PestanasDelRapido({ leadId, pestana, alElegir, resumen }: Props) {
  const id = useId()
  const lista = useRef<HTMLDivElement>(null)
  const alPulsar = (evento: KeyboardEvent) => {
    const destino = siguiente(pestana, evento.key)
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
        aria-label="Secciones del lead"
        onKeyDown={alPulsar}
        className="bg-muted text-muted-foreground inline-flex h-11 w-full items-center rounded-lg p-[3px] md:h-8 md:w-fit"
      >
        {PESTANAS_DEL_RAPIDO.map((p) => {
          const activa = p.clave === pestana
          return (
            <button
              key={p.clave}
              type="button"
              role="tab"
              id={`${id}-${p.clave}`}
              data-pestana={p.clave}
              aria-selected={activa}
              aria-controls={`${id}-panel`}
              tabIndex={activa ? 0 : -1}
              onClick={() => {
                alElegir(p.clave)
              }}
              className={`inline-flex h-full flex-1 items-center justify-center rounded-md px-3 text-(length:--text-sm) font-medium outline-none focus-visible:shadow-(--shadow-focus) md:flex-none ${
                activa ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'
              }`}
            >
              {p.titulo}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${pestana}`}>
        {pestana === 'seguimientos' ? <SeguimientosDelRapidoDiferido leadId={leadId} /> : resumen}
      </div>
    </div>
  )
}
