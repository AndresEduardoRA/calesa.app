'use client'

import { diferido } from '@/shared/ui/diferido'

// El editor de la plantilla de la tarjeta (4.19-3b): la pestaña no carga el código del formulario para mostrarse; se pide cuando hay una fórmula que editar.
export const EditorDeLaPlantillaDiferido = diferido(
  () => import('./editor-de-la-plantilla').then((modulo) => modulo.EditorDeLaPlantilla),
  { aviso: 'aqui' },
)
