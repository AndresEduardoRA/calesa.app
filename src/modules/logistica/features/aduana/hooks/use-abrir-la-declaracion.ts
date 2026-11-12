'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'

// Qué declaración está abierta en el panel lateral de la lista (`?declaracion=`, la clave la pone `src/app`, dueña del drawer). Abrir suma al historial («atrás» lo cierra y devuelve
// el foco a la fila) y conserva los filtros y la página de la URL. `shallow: false`: el resumen se lee en el servidor, y cerrar vuelve a pedir la lista.
export function useAbrirLaDeclaracion(clave: string) {
  const [abierta, setAbierta] = useQueryState(clave, parseAsString.withOptions({ shallow: false }))
  useVueltaDelFoco(clave, abierta !== null)
  return {
    abierta,
    abrir: (id: string) => {
      abrirConVuelta(clave, () => setAbierta(id, { history: 'push' }), abierta === id)
    },
  }
}
