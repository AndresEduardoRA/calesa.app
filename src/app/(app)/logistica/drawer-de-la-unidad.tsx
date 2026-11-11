'use client'

import { parseAsString, useQueryState } from 'nuqs'
import type { ReactNode } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import { CLAVE_DE_UNIDAD } from './clave-de-unidad'

// El panel de la unidad sobre la cadena (6.01, D1). Es el marco: lo de adentro (`<UnidadAbierta>`, que lee la unidad) llega de la página como hijo, porque lee la base. Cerrar
// quita `?vehiculo=` y vuelve a pedir la página al servidor (`shallow: false`), así el panel no queda montado con una unidad que ya no se muestra. El panel sólo muestra: no
// guarda nada tipeado, así que cerrar no pregunta (`scripts/guardas/drawers-con-salida.ts`). Abrirlo desde una tarjeta, sumando al historial, es del 6.03.
export function DrawerDeLaUnidad({ children }: { children: ReactNode }) {
  const [id, setId] = useQueryState(CLAVE_DE_UNIDAD, parseAsString.withOptions({ shallow: false }))
  return (
    <Drawer
      abierto={id !== null}
      alCerrar={() => {
        void setId(null)
      }}
      titulo="Unidad"
      descripcion="El vehículo y lo que falta o se hizo en su recorrido."
      ancho="amplio"
    >
      {children}
    </Drawer>
  )
}
