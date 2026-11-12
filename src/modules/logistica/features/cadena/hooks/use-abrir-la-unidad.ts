'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'

// Qué unidad está abierta en el panel lateral de la cadena (`?vehiculo=`, la clave que pone `src/app`, dueña del panel). Abrir suma al historial («atrás» lo cierra y devuelve el foco a la
// tarjeta) y conserva origen, filtros y fase de la URL. `shallow: false`: la unidad se lee en el servidor y cerrar vuelve a pedir la cadena, así lo que se guardó en el panel se ve al volver.
// Es la misma pieza que `useAbrirLaUnidad` del área `dinero`: un área no importa otra (`areas-de-logistica.test.ts`), así que cada una tiene la suya.
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
