'use client'

import { ChevronRightIcon } from 'lucide-react'
import type { Ref } from 'react'

type Props = {
  // Los títulos de las secciones que esconde, ya unidos.
  titulos: string
  // Alguna celda de lo que esconde tiene un aviso: se dice con texto, nunca sólo con color.
  porRevisar: boolean
  alAbrir: () => void
  boton: Ref<HTMLButtonElement>
}

export const AVISO_POR_REVISAR = 'Hay datos por revisar.'

// El botón «Avanzado» (paso 4.13-4a): va en el lugar de la primera sección avanzada y dice qué hay detrás. Lo que abre es un modal con su URL (`ModalDeAvanzado`).
export function BotonDeAvanzado({ titulos, porRevisar, alAbrir, boton }: Props) {
  return (
    <div data-avanzado="" className="min-w-0">
      <button
        ref={boton}
        type="button"
        onClick={alAbrir}
        aria-describedby={porRevisar ? 'aviso-de-avanzado' : undefined}
        className="flex min-h-[44px] w-full min-w-0 items-center gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4 text-left transition outline-none hover:bg-(--color-surface-2) focus-visible:shadow-(--shadow-focus)"
      >
        <span className="grid min-w-0 flex-1 gap-1">
          <span className="text-(length:--text-base) font-semibold text-(--color-ink)">
            Avanzado
          </span>
          {titulos === '' ? null : (
            <span className="text-(length:--text-sm) break-words text-(--color-ink-soft)">
              {titulos}
            </span>
          )}
          {porRevisar ? (
            <span id="aviso-de-avanzado" className="text-(length:--text-sm) text-(--color-ink)">
              {AVISO_POR_REVISAR}
            </span>
          ) : null}
        </span>
        <ChevronRightIcon aria-hidden className="size-4 shrink-0" />
      </button>
    </div>
  )
}
