import { ViewTransition, type ReactNode } from 'react'

// Envuelve el contenido de una página para que el cambio de ruta haga un fundido corto (View
// Transitions). La duración sale de `--dur-pagina`, que vale 0 con `prefers-reduced-motion`
// (design/tokens.css); además globals.css apaga la animación entera en ese caso.
// Para que un elemento «viaje» entre dos pantallas (una foto, un título), envolverlo en su
// propio <ViewTransition name="…"> con el mismo nombre en origen y destino.
export function TransicionPagina({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="pagina" exit="pagina" default="none">
      {children}
    </ViewTransition>
  )
}
