'use client'

import type { ReactNode } from 'react'
import { useAtajo } from './atajos'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'

type Props = {
  // Controlado siempre, igual que <Drawer>: el estado de «abierto» vive en la URL.
  abierto: boolean
  alCerrar: () => void
  titulo: string
  descripcion?: string
  pie?: ReactNode
  children?: ReactNode
}

// Diálogo centrado para una decisión o un formulario corto. Nunca abre otro modal: si hace falta
// un segundo nivel, es un <Drawer> o una página.
export function Modal({ abierto, alCerrar, titulo, descripcion, pie, children }: Props) {
  useAtajo('cerrar', alCerrar, abierto)

  return (
    <Dialog
      open={abierto}
      onOpenChange={(sigueAbierto) => {
        if (!sigueAbierto) {
          alCerrar()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion ? <DialogDescription>{descripcion}</DialogDescription> : null}
        </DialogHeader>
        {children}
        {pie ? <DialogFooter>{pie}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  )
}
