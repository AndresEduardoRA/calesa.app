'use client'

import { SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { useAtajo } from '@/shared/ui/atajos'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { AccionDeLaPaleta } from '../../../entities/acciones-de-la-paleta'
import { PaletaDiferida, adelantarLaPaleta } from './diferidos'

type Props = {
  acciones: readonly AccionDeLaPaleta[]
  alAbrirNuevoLead: () => void
  alVerAtajos: () => void
}

// El botón del buscador global de la barra y la paleta que abre (`Ctrl/Cmd+K`). Es opcional en la barra del celular (`.claude/rules/ui.md`): con la barra de menos de 24 rem
// (el celular con el texto al 200 %) queda sólo el icono, en un blanco de 44 px (en px, no en rem: en rem se duplicaba con el texto) y con su nombre; desde 24 rem, el icono y
// «Buscar» entero. La barra es el `@container` (`marco.tsx`), no la ventana. La paleta va diferida: no viaja hasta que alguien pulsa el botón o lo toca con el puntero.
export function Buscador({ acciones, alAbrirNuevoLead, alVerAtajos }: Props) {
  const [abierta, setAbierta] = useState(false)
  // Con la paleta abierta, otro `Ctrl+K` no la cierra (se cierra con Esc, que atiende Base UI).
  useAtajo('buscar', () => {
    setAbierta(true)
  })
  const montada = useAbiertoAlgunaVez(abierta)
  return (
    <>
      <button
        type="button"
        aria-label="Buscar"
        aria-haspopup="dialog"
        onPointerEnter={adelantarLaPaleta}
        onFocus={adelantarLaPaleta}
        onClick={() => {
          setAbierta(true)
        }}
        className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-(--radius-md) border border-(--color-line) bg-(--color-surface-2) text-(length:--text-sm) text-(--color-ink-soft) hover:text-(--color-ink) md:h-9 md:max-w-none @min-[24rem]:w-auto @min-[24rem]:min-w-0 @min-[24rem]:flex-1 @min-[24rem]:justify-start @min-[24rem]:gap-2 @min-[24rem]:px-2.5 md:@min-[24rem]:max-w-sm"
      >
        <SearchIcon aria-hidden className="size-4 shrink-0" />
        <span aria-hidden className="hidden @min-[24rem]:inline">
          Buscar
        </span>
        <kbd
          aria-hidden
          className="ml-auto hidden rounded-(--radius-sm) border border-(--color-line) px-1.5 font-mono text-(length:--text-xs) md:@min-[24rem]:inline"
        >
          Ctrl K
        </kbd>
      </button>
      {montada && (
        <PaletaDiferida
          abierta={abierta}
          alCambiar={setAbierta}
          acciones={acciones}
          alAbrirNuevoLead={alAbrirNuevoLead}
          alVerAtajos={alVerAtajos}
        />
      )}
    </>
  )
}
