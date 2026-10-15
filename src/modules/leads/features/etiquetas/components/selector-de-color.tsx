'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { CLAVES_DE_COLOR, NOMBRE_DEL_COLOR, type ColorDeEtiqueta } from '../../../entities/etiqueta'
import { PuntoDeColor } from './insignia-de-etiqueta'

type Props = {
  color: ColorDeEtiqueta
  // De qué etiqueta: «Color de VIP».
  de: string
  deshabilitado: boolean
  alElegir: (color: ColorDeEtiqueta) => void
}

// El color de una etiqueta, elegido de la paleta: cada opción dice su nombre (nunca sólo el color).
export function SelectorDeColor({ color, de, deshabilitado, alElegir }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Color de ${de}: ${NOMBRE_DEL_COLOR[color]}`}
        disabled={deshabilitado}
        className="flex h-11 items-center gap-1.5 rounded-(--radius-md) border border-(--color-line) px-2 text-(length:--text-sm) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) disabled:opacity-50 md:h-8"
      >
        <PuntoDeColor color={color} className="size-3" />
        <span className="hidden sm:inline">{NOMBRE_DEL_COLOR[color]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup
          value={color}
          onValueChange={(valor) => {
            const elegido = CLAVES_DE_COLOR.find((clave) => clave === valor)
            if (elegido && elegido !== color) {
              alElegir(elegido)
            }
          }}
        >
          {CLAVES_DE_COLOR.map((clave) => (
            <DropdownMenuRadioItem key={clave} value={clave} className="min-h-11 md:min-h-8">
              <PuntoDeColor color={clave} className="size-3" />
              {NOMBRE_DEL_COLOR[clave]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
