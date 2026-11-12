'use client'

import { parseAsString, useQueryState } from 'nuqs'
import type { ReactNode } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import type { VistaDeGrupos } from '../../../entities/transporte/paneles'

type Props = {
  // El `?booking=` o `?contenedor=` de la página (lo pone `src/app`: una constante importada de un archivo `'use client'` llega como referencia).
  clave: string
  vista: VistaDeGrupos
  children: ReactNode
}

// El panel del resumen de un grupo sobre la lista. Es el marco: lo de adentro (`<ResumenDelGrupo>`, que se lee en el servidor) llega de la página como hijo. Cerrar quita la clave de la URL y
// vuelve a pedir la página al servidor (`shallow: false`). El panel sólo muestra: no guarda nada tipeado, así que cerrar no pregunta.
export function DrawerDelGrupo({ clave, vista, children }: Props) {
  const [id, setId] = useQueryState(clave, parseAsString.withOptions({ shallow: false }))
  return (
    <Drawer
      abierto={id !== null}
      alCerrar={() => {
        void setId(null)
      }}
      titulo={vista === 'contenedores' ? 'Contenedor' : 'Embarque'}
      descripcion="Las unidades del grupo y lo que se puede hacer con ellas."
      ancho="amplio"
    >
      {children}
    </Drawer>
  )
}
