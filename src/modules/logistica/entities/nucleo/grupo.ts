import type { ComponentType } from 'react'

import type { ClavePermiso } from '@/shared/lib/permisos'

// Los huecos del resumen de un grupo (embarque, contenedor o declaración) y los de la sub-navegación y de Configuración (6.01). Sólo tipos: cada
// área llena los suyos en `pantallas/<área>-grupo.ts`, `<área>-enlace.ts` y `<área>-catalogos.ts`, y `src/app` los une.
export type GrupoDeLogistica = { tipo: 'embarque' | 'contenedor' | 'declaracion'; id: string }

export type HuecoDelGrupo = {
  clave: string
  titulo: string
  permisos: readonly ClavePermiso[]
  regla: string | null
  componente: ComponentType<{ grupo: GrupoDeLogistica }>
}
