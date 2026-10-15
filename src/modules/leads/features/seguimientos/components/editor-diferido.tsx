'use client'

import dynamic from 'next/dynamic'
import type { PropsDelEditor } from './editor-enriquecido'

// El editor se pide recién al abrir el redactor: la ficha no carga Tiptap para mostrar los
// seguimientos. Mientras llega, un marco del mismo alto.
export const EditorDiferido = dynamic<PropsDelEditor>(() => import('./editor-enriquecido'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden
      className="h-[9.5rem] animate-pulse rounded-(--radius-md) border border-(--color-line) bg-(--color-paper-dim)"
    />
  ),
})
