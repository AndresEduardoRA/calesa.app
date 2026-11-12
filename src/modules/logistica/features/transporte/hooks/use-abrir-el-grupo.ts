'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'

// Qué grupo está abierto en el panel lateral de la lista (`?booking=` o `?contenedor=`, la clave la pone `src/app`, dueña del drawer). Abrir suma al historial («atrás» lo cierra y devuelve el
// foco a la fila) y conserva los filtros y la página de la URL. `shallow: false`: el resumen se lee en el servidor, y cerrar vuelve a pedir la lista.
export function useAbrirElGrupo(clave: string) {
  const [abierto, setAbierto] = useQueryState(clave, parseAsString.withOptions({ shallow: false }))
  useVueltaDelFoco(clave, abierto !== null)
  return {
    abierto,
    abrir: (id: string) => {
      abrirConVuelta(clave, () => setAbierto(id, { history: 'push' }), abierto === id)
    },
  }
}
