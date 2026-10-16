'use client'

import type { ComponentProps, ReactNode } from 'react'
import { XIcon } from 'lucide-react'
import { cn } from 'cn'
import { Button } from './button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'

type Popup = ComponentProps<typeof DialogContent>

type Props = {
  // Controlado siempre, igual que <Drawer>: el estado de «abierto» vive en la URL.
  abierto: boolean
  // Esc, la ✕ y el clic afuera. Un formulario con cambios pasa `intentarCerrar` de
  // `useCierreConCambios`, que pregunta en el pie antes de cerrar.
  alCerrar: () => void
  titulo: string
  descripcion?: string
  pie?: ReactNode
  children?: ReactNode
  // «amplio» para lo que no entra en 384 px (un texto para copiar, una fila de atajos).
  ancho?: 'normal' | 'amplio'
  // Mientras guarda: no se cierra con Esc, la ✕ ni el clic afuera (el pedido en vuelo podría volver
  // con el modal cerrado).
  bloqueado?: boolean
  // A dónde va el foco al abrir y al cerrar (los de Base UI). Sin ellos: el primer control y el
  // elemento que tenía el foco antes de abrir.
  focoInicial?: Popup['initialFocus']
  focoAlCerrar?: Popup['finalFocus']
  // Cuando terminó de irse (la animación de cierre): lo que no debe quedar en memoria (una clave) se
  // olvida acá y no al cerrar, así no cambia lo que se ve mientras se va.
  alTerminarDeCerrar?: () => void
}

// Diálogo centrado para una decisión o un formulario corto. Nunca abre otro modal: si hace falta
// un segundo nivel, es un <Drawer> o una página. El cuerpo se desplaza y el pie queda a la vista; en
// el celular va arriba, para que el teclado no tape el campo.
export function Modal({
  abierto,
  alCerrar,
  titulo,
  descripcion,
  pie,
  children,
  ancho = 'normal',
  bloqueado = false,
  focoInicial,
  focoAlCerrar,
  alTerminarDeCerrar,
}: Props) {
  // Esc lo atiende Base UI, que cierra sólo el diálogo de más arriba y detiene el evento: mientras
  // un diálogo está abierto, el atajo «cerrar» de la pila no lo ve (por eso el Modal no lo registra).
  return (
    <Dialog
      open={abierto}
      onOpenChange={(sigueAbierto) => {
        if (sigueAbierto || bloqueado) {
          return
        }
        alCerrar()
      }}
      onOpenChangeComplete={(sigueAbierto) => {
        if (!sigueAbierto) {
          alTerminarDeCerrar?.()
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        initialFocus={focoInicial}
        finalFocus={focoAlCerrar}
        className={cn(
          'flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 max-sm:top-4 max-sm:translate-y-0',
          ancho === 'amplio' && 'sm:max-w-lg',
        )}
      >
        <DialogHeader className="shrink-0 p-4 pr-12">
          <DialogTitle className="leading-snug">{titulo}</DialogTitle>
          {descripcion ? <DialogDescription>{descripcion}</DialogDescription> : null}
        </DialogHeader>
        {children ? (
          <div className="grid min-h-0 min-w-0 flex-1 gap-4 overflow-y-auto px-4 pt-0.5 pb-4">
            {children}
          </div>
        ) : null}
        {pie ? (
          <DialogFooter className="m-0 shrink-0 sm:flex-wrap [&_button]:min-h-11 sm:[&_button]:min-h-8">
            {pie}
          </DialogFooter>
        ) : null}
        <DialogClose
          disabled={bloqueado}
          render={<Button variant="ghost" className="absolute top-2 right-2" size="icon-sm" />}
        >
          <XIcon />
          <span className="sr-only">Cerrar</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
