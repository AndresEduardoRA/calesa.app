'use client'

import { createContext, useContext, useEffect, useRef } from 'react'

// Una salida pendiente (la acción de un aviso, «Abrir ficha»): con algo escrito se pregunta en el mismo pie, como en un modal.
// Es lo que devuelve `useCierreConCambios()`.
export type SalidaPendiente = { confirmando: boolean; seguir: () => void; descartar: () => void }

export type RegistroDeCambios = {
  // El formulario de adentro dice si tiene algo escrito y qué se tira al descartar (su borrador).
  anotar: (hayCambios: boolean, alDescartar?: () => void) => void
  salida: SalidaPendiente
}

// Lo pone cada `<Drawer>`: un panel con formulario no sabe de la pregunta ni de su pie, sólo dice si tiene algo escrito
// (`useCambiosSinGuardar()`); el `<Drawer>` anota la pregunta (`salirSinPerder()`) y la dibuja en su pie, o `<PieDelPanel>` si el pie
// va dentro del cuerpo.
export const ContextoDeCambios = createContext<RegistroDeCambios | null>(null)

// Lo que llama un formulario dentro de un `<Drawer>`: con algo escrito, la acción de un aviso que sale de la pantalla (`sale: true`)
// pregunta en el pie del panel antes de irse. Cerrar el panel no pregunta: lo escrito queda en su borrador. Fuera de un `<Drawer>`
// no hace nada. `alDescartar` tira el borrador cuando la persona elige descartar.
export function useCambiosSinGuardar(hayCambios: boolean, alDescartar?: () => void): void {
  const registro = useContext(ContextoDeCambios)
  const anotar = registro?.anotar
  const descartar = useRef(alDescartar)
  useEffect(() => {
    descartar.current = alDescartar
  })
  useEffect(() => {
    if (!anotar) {
      return
    }
    anotar(hayCambios, () => {
      descartar.current?.()
    })
    return () => {
      anotar(false)
    }
  }, [anotar, hayCambios])
}

// La pregunta que el `<Drawer>` de este panel tiene pendiente, si la hay.
export function useSalidaDelDrawer(): SalidaPendiente | undefined {
  return useContext(ContextoDeCambios)?.salida
}
