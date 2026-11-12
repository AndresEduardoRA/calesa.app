'use client'

import { parseAsString, useQueryState } from 'nuqs'
import type { ReactNode } from 'react'
import { Drawer } from '@/shared/ui/drawer'

type Props = {
  // El `?declaracion=` de la página (la pone `src/app`: una constante importada de un archivo `'use client'` llega como referencia).
  clave: string
  children: ReactNode
}

// El panel del resumen de una declaración sobre la lista. Es el marco: lo de adentro (`<ResumenDeLaDeclaracion>`, que se lee en el servidor) llega de la página como hijo. Cerrar quita
// `?declaracion=` y vuelve a pedir la página al servidor (`shallow: false`). El panel sólo muestra: no guarda nada tipeado, así que cerrar no pregunta.
export function DrawerDeLaDeclaracion({ clave, children }: Props) {
  const [id, setId] = useQueryState(clave, parseAsString.withOptions({ shallow: false }))
  return (
    <Drawer
      abierto={id !== null}
      alCerrar={() => {
        void setId(null)
      }}
      titulo="Declaración"
      descripcion="Los datos de la declaración aduanera y sus vehículos."
      ancho="amplio"
    >
      {children}
    </Drawer>
  )
}
