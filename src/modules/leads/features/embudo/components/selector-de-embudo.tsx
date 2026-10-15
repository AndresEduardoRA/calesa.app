'use client'

import { ChevronDownIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import type { Embudo } from '../../../entities/embudo'

type Props = {
  embudos: readonly Embudo[]
  actual: string
  alElegir: (id: string) => void
}

// Cuál de sus embudos se ve. Con uno solo, sólo lo nombra.
export function SelectorDeEmbudo({ embudos, actual, alElegir }: Props) {
  const elegido = embudos.find((e) => e.id === actual)
  if (embudos.length < 2) {
    return (
      <h2 className="text-(length:--text-base) font-medium text-(--color-ink)">
        {elegido?.nombre}
      </h2>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Embudo: ${elegido?.nombre ?? ''}`}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-(--radius-md) border border-(--color-line) px-3 text-(length:--text-sm) font-medium outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:min-h-9"
      >
        {elegido?.nombre}
        <ChevronDownIcon aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuRadioGroup
          value={actual}
          onValueChange={(valor) => {
            if (typeof valor === 'string' && valor !== actual) {
              alElegir(valor)
            }
          }}
        >
          {embudos.map((embudo) => (
            <DropdownMenuRadioItem
              key={embudo.id}
              value={embudo.id}
              className="min-h-11 md:min-h-8"
            >
              {embudo.nombre}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
