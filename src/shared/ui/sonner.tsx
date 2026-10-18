'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useAvisosSobreElPie, VARIABLE_DE_AVISOS } from './avisos-sobre-el-pie'
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react'

// Los avisos salen abajo a la derecha: con un panel abierto suben sobre su pie (`useAvisosSobreElPie()` pone la variable; sin panel, el
// margen de siempre: 24 px en escritorio y 16 en el celular).
const ABAJO = `var(${VARIABLE_DE_AVISOS}, 24px)`
const ABAJO_EN_EL_CELULAR = `var(${VARIABLE_DE_AVISOS}, 16px)`

// 356 px (lo de sonner) en rem, y nunca más que la pantalla menos un margen de 1 rem por lado.
const ANCHO_DEL_AVISO = 'min(22.25rem, calc(100vw - 2rem))'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()
  useAvisosSobreElPie()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      // Lo que anuncia el lector de pantalla: sonner lo trae en inglés («Notifications alt+T», «Close
      // toast»). El atajo para llegar a los avisos se dice en español.
      offset={{ bottom: ABAJO }}
      mobileOffset={{ bottom: ABAJO_EN_EL_CELULAR }}
      customAriaLabel="Avisos (Alt+T para ir a ellos)"
      icons={{
        success: <CircleCheckIcon className="size-[16px]" />,
        info: <InfoIcon className="size-[16px]" />,
        warning: <TriangleAlertIcon className="size-[16px]" />,
        error: <OctagonXIcon className="size-[16px]" />,
        loading: <Loader2Icon className="size-[16px] animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
          // Sonner fija el ancho en 356 px: con el texto al 200 % un aviso con descripción quedaba en una columna angosta (título en tres
          // líneas, la descripción en siete y «Ingresar» apretado). El ancho sigue a la raíz, sin salirse de la pantalla.
          '--width': ANCHO_DEL_AVISO,
          // Sonner inyecta su propio `font-family` (el del sistema) en su contenedor y le gana al que hereda de `<html>`: en línea
          // le gana a ese. La tipografía de la app es una sola (`design/tokens.css`).
          fontFamily: 'var(--font-sans)',
        } as React.CSSProperties
      }
      toastOptions={{
        closeButtonAriaLabel: 'Cerrar aviso',
        // Sonner fija 13 px al aviso y 12 al botón, y 16 px a la caja del icono: con el texto al 200 % el texto se quedaba chico y el
        // icono (en rem) se comía su primera letra. El texto sigue a la raíz (inline: le gana al CSS de sonner) y el icono mide lo que su caja.
        style: { fontSize: 'var(--text-sm)' },
        actionButtonStyle: { fontSize: 'var(--text-xs)', height: 'auto', minHeight: '1.5rem' },
        cancelButtonStyle: { fontSize: 'var(--text-xs)', height: 'auto', minHeight: '1.5rem' },
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
