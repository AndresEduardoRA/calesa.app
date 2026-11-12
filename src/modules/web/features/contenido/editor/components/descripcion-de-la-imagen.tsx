'use client'

import { useEditorState, type Editor } from '@tiptap/react'
import { useId } from 'react'
import { Input } from '@/shared/ui/input'
import { MAXIMO_DEL_ALT } from '../../../../entities/contenido/doc'

// Con una imagen elegida, el texto que la describe (el `alt`): lo lee quien no la ve.
export function DescripcionDeLaImagen({ editor }: { editor: Editor }) {
  const id = useId()
  const alt = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const valor: unknown = e.getAttributes('image')['alt']
      return typeof valor === 'string' ? valor : ''
    },
  })
  return (
    <div className="grid gap-1.5 border-t border-(--color-line) p-2">
      <label htmlFor={id} className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Describe la imagen
      </label>
      <Input
        id={id}
        value={alt}
        maxLength={MAXIMO_DEL_ALT}
        autoComplete="off"
        className="min-h-11 md:min-h-8"
        onChange={(evento) => {
          editor.chain().updateAttributes('image', { alt: evento.target.value }).run()
        }}
      />
    </div>
  )
}
