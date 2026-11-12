'use client'

import { diferido } from '@/shared/ui/diferido'
import type { PropsDelEditorDeDocumento } from './editor-de-documento'

// El editor se pide recién al abrir la página de la guía: el hub y la lista no cargan Tiptap. Mientras llega, un marco del mismo alto.
export const EditorDeDocumentoDiferido = diferido<PropsDelEditorDeDocumento>(
  () => import('./editor-de-documento').then((modulo) => modulo.EditorDeDocumento),
  {
    aviso: 'aqui',
    esqueleto: (
      <div
        aria-hidden
        className="h-80 animate-pulse rounded-(--radius-md) border border-(--color-line) bg-(--color-paper-dim)"
      />
    ),
  },
)
