'use client'

import type { ReactNode } from 'react'
import { cn } from 'cn'
import { useAtajo } from './atajos'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from './sheet'

type Props = {
  // Controlado siempre: quién lo abre guarda el estado en la URL (`?panel=`, `?id=`), para que
  // el panel sobreviva a recargar y a compartir el enlace.
  abierto: boolean
  alCerrar: () => void
  titulo: string
  descripcion?: string
  // En móvil conviene 'bottom' (hoja inferior).
  lado?: 'right' | 'left' | 'bottom'
  // Un formulario con muchos campos pide más lugar que una ficha corta.
  ancho?: 'normal' | 'amplio'
  pie?: ReactNode
  children: ReactNode
}

// Panel lateral: el segundo nivel de cualquier pantalla (crear, editar, ver una ficha sin salir
// de la lista). Un modal nunca abre otro modal; un drawer sí puede abrirse desde uno.
export function Drawer({
  abierto,
  alCerrar,
  titulo,
  descripcion,
  lado = 'right',
  ancho = 'normal',
  pie,
  children,
}: Props) {
  useAtajo('cerrar', alCerrar, abierto)

  return (
    <Sheet
      open={abierto}
      onOpenChange={(sigueAbierto) => {
        if (!sigueAbierto) {
          alCerrar()
        }
      }}
    >
      <SheetContent
        side={lado}
        // La hoja inferior no pasa del alto de la pantalla: lo de adentro se desplaza.
        className={cn(
          'gap-0',
          lado === 'bottom'
            ? 'max-h-[85dvh] rounded-t-(--radius-card)'
            : ancho === 'amplio'
              ? 'data-[side=left]:w-full data-[side=right]:w-full sm:max-w-xl data-[side=left]:sm:max-w-xl data-[side=right]:sm:max-w-xl'
              : 'sm:max-w-md',
        )}
      >
        <SheetHeader className="border-b border-(--color-line)">
          <SheetTitle>{titulo}</SheetTitle>
          {descripcion ? <SheetDescription>{descripcion}</SheetDescription> : null}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {pie ? <SheetFooter className="border-t border-(--color-line)">{pie}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  )
}
