'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'

// Qué unidad está abierta en el panel lateral de la lista (`?vehiculo=`, la misma clave que `/logistica`: la pone la página, que es la dueña del drawer). Abrir suma al historial
// («atrás» lo cierra y devuelve el foco a la fila) y conserva los filtros y la página de la URL. `shallow: false`: la unidad se lee en el servidor, y cerrar vuelve a pedir la lista,
// así lo que se guardó en el panel se ve al volver.
export function useAbrirLaUnidad(clave: string) {
  const [abierta, setAbierta] = useQueryState(clave, parseAsString.withOptions({ shallow: false }))
  useVueltaDelFoco(clave, abierta !== null)
  return {
    abierta,
    abrir: (id: string) => {
      abrirConVuelta(clave, () => setAbierta(id, { history: 'push' }), abierta === id)
    },
  }
}
