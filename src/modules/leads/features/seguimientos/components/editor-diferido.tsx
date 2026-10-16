'use client'

import { diferido } from '@/shared/ui/diferido'
import type { PropsDelEditor } from './editor-enriquecido'

// El editor se pide recién al abrir el redactor: la ficha no carga Tiptap para mostrar los
// seguimientos. Mientras llega, un marco del mismo alto.
export const EditorDiferido = diferido<PropsDelEditor>(() => import('./editor-enriquecido'), {
  aviso: 'aqui',
  esqueleto: (
    <div
      aria-hidden
      className="h-[9.5rem] animate-pulse rounded-(--radius-md) border border-(--color-line) bg-(--color-paper-dim)"
    />
  ),
})
