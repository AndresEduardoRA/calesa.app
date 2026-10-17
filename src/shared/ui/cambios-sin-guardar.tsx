'use client'

import { useCambiosSinGuardar } from './cambios-del-panel'

// `useCambiosSinGuardar()` para un panel cuyo estado vive en el mismo componente que el `<Drawer>` (el contexto del `<Drawer>` sólo
// llega a lo que está adentro): se dibuja como hijo del `<Drawer>` y no muestra nada.
export function CambiosSinGuardar({
  hayCambios,
  alDescartar,
}: {
  hayCambios: boolean
  alDescartar?: () => void
}) {
  useCambiosSinGuardar(hayCambios, alDescartar)
  return null
}
