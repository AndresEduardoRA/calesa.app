'use client'

import { type Editor } from '@tiptap/react'
import { hrefSeguro } from '../../../../entities/contenido/doc'
import { FormularioDeEnlace } from './formulario-de-enlace'

export function enlaceActual(editor: Editor): string | null {
  const href: unknown = editor.getAttributes('link')['href']
  return typeof href === 'string' ? href : null
}

// Sin texto elegido y fuera de un enlace, la dirección se escribe como texto del enlace.
function aplicarEnlace(editor: Editor, href: string) {
  const cadena = editor.chain().focus().extendMarkRange('link')
  if (editor.state.selection.empty && enlaceActual(editor) === null) {
    cadena
      .insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] })
      .run()
  } else {
    cadena.setLink({ href }).run()
  }
}

// La dirección del enlace bajo la barra: aplica, quita o cierra sin tocar nada.
export function PanelDelEnlace({ editor, cerrar }: { editor: Editor; cerrar: () => void }) {
  return (
    <FormularioDeEnlace
      actual={enlaceActual(editor)}
      validar={hrefSeguro}
      alAplicar={(href) => {
        aplicarEnlace(editor, href)
        cerrar()
      }}
      alQuitar={() => {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
        cerrar()
      }}
      alCerrar={() => {
        cerrar()
        editor.commands.focus()
      }}
    />
  )
}
