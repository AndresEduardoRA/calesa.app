import type { ComponentType } from 'react'

import type { ClavePermiso } from '@/shared/lib/permisos'

// Un enlace de la sub-navegación de `/logistica` (Embarques, Aduana, Gastos) y una pestaña de `/configuracion/logistica` (6.01). Nulo hasta que
// existe la página o el catálogo: el layout y la sección sólo dibujan lo que está lleno y que la persona puede ver.
export type EnlaceDeLogistica = {
  titulo: string
  ruta: string
  permiso: ClavePermiso
}

export type CatalogoDeLogistica = {
  clave: string
  titulo: string
  permiso: ClavePermiso
  componente: ComponentType
}
