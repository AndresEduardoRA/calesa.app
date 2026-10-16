'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          // El aviso sale abajo a la derecha, justo sobre el pie de un panel («Cerrar», «Guardar»), y
          // con el puntero encima sonner pausa su temporizador: tapaba el botón y no se iba. El aviso
          // deja pasar el puntero; sólo sus botones («Descartar», «Deshacer», la ✕) lo reciben.
          toast: 'cn-toast pointer-events-none [&_button]:pointer-events-auto',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
