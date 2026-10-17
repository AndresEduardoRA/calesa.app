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
      // Lo que anuncia el lector de pantalla: sonner lo trae en inglés («Notifications alt+T», «Close
      // toast»). El atajo para llegar a los avisos se dice en español.
      customAriaLabel="Avisos (Alt+T para ir a ellos)"
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
          // Sonner inyecta su propio `font-family` (el del sistema) en su contenedor y le gana al que hereda de `<html>`: en línea
          // le gana a ese. La tipografía de la app es una sola (`design/tokens.css`).
          fontFamily: 'var(--font-sans)',
        } as React.CSSProperties
      }
      toastOptions={{
        closeButtonAriaLabel: 'Cerrar aviso',
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
