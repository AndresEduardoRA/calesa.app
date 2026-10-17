'use client'

import type { ReactNode } from 'react'
import { useSalidaDelDrawer } from './cambios-del-panel'
import { ConfirmarDescarte } from './confirmar-descarte'

// El pie de un panel con sus botones propios, dentro del cuerpo del `<Drawer>` (el que no usa `<PieDelPanel>` ni la ranura `pie`).
// Cuando la acción de un aviso que sale de la pantalla se pulsa con algo escrito, dibuja la pregunta («Tienes cambios sin
// guardar.») en vez de los botones; el resto del tiempo es un `<div>` con sus clases.
export function PieConSalida({ className, children }: { className?: string; children: ReactNode }) {
  const salida = useSalidaDelDrawer()
  return (
    <div className={className}>
      {salida?.confirmando ? (
        <ConfirmarDescarte alSeguir={salida.seguir} alDescartar={salida.descartar} />
      ) : (
        children
      )}
    </div>
  )
}
