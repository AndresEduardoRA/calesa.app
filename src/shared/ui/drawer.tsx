'use client'

import type { ReactNode } from 'react'
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
      <SheetContent side={lado} className="gap-0 sm:max-w-md">
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
