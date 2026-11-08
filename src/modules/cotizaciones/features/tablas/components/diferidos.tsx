'use client'

import { diferido } from '@/shared/ui/diferido'

// El editor de una tabla de referencia (4.23-3): ocupa el lugar de la lista y se pide al abrir una tabla (`?tabla=`); la pestaña no lo carga para mostrar la lista.
export const EditorDeTablaDiferido = diferido(
  () => import('./editor-de-tabla').then((modulo) => modulo.EditorDeTabla),
  { aviso: 'aqui' },
)
