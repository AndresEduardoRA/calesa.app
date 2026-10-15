'use client'

import { EditorContent, Extension, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'
import type { Documento } from '../../../entities/documento'
import { hrefSeguro } from '../../../entities/documento'
import { documentoLimpio } from '../../../entities/documento-limpio'
import { BarraDelEditor } from './barra-del-editor'

export type PropsDelEditor = {
  valor: Documento | null
  alCambiar: (documento: Documento | null) => void
  // El id de la etiqueta visible («Detalle»).
  etiquetaId: string
  // El id del motivo bajo el campo, si lo hay.
  errorId?: string
  invalido: boolean
  deshabilitado: boolean
}

// `Ctrl/Cmd+Enter` es «guardar» en toda la app: acá adentro no inserta un salto (el salto es
// `Shift+Enter`). Se atiende sin hacer nada y el evento sigue hasta el registro de atajos.
const SinSaltoConModEnter = Extension.create({
  name: 'sinSaltoConModEnter',
  priority: 1000,
  addKeyboardShortcuts() {
    return { 'Mod-Enter': () => true }
  },
})

// Sólo lo que la lista blanca admite: párrafos, negrita, cursiva, las dos listas y enlaces
// http, https, mailto o tel. Lo demás de StarterKit, apagado; lo que se pega pasa por este esquema y
// se cae lo que no está.
const EXTENSIONES = [
  StarterKit.configure({
    blockquote: false,
    code: false,
    codeBlock: false,
    heading: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    dropcursor: false,
    link: {
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: 'https',
      protocols: ['mailto', 'tel'],
      isAllowedUri: (url) => hrefSeguro(url) !== null,
      HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: null, class: null },
    },
  }),
  SinSaltoConModEnter,
]

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// El editor del detalle de un seguimiento. Lo que sale ya está reducido a la lista blanca
// (`documentoLimpio`). Se carga aparte (`editor-diferido`): la ficha no lo paga hasta abrir el
// redactor.
export default function EditorEnriquecido({
  valor,
  alCambiar,
  etiquetaId,
  errorId,
  invalido,
  deshabilitado,
}: PropsDelEditor) {
  const editor = useEditor({
    extensions: EXTENSIONES,
    content: valor ?? '',
    editable: !deshabilitado,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': etiquetaId,
        ...(errorId ? { 'aria-describedby': errorId } : {}),
        ...(invalido ? { 'aria-invalid': 'true' } : {}),
        class:
          'documento-de-seguimiento min-h-28 px-3 py-2 text-(length:--text-sm) text-(--color-ink) outline-none',
      },
    },
    onUpdate: ({ editor: e }) => {
      alCambiar(documentoLimpio(e.getJSON()))
    },
  })

  // Lo que cambia desde afuera (un borrador que se repone, el redactor que se vacía al guardar).
  useEffect(() => {
    if (editor && !igual(documentoLimpio(editor.getJSON()), valor)) {
      editor.commands.setContent(valor ?? '', { emitUpdate: false })
    }
  }, [editor, valor])

  useEffect(() => {
    editor?.setEditable(!deshabilitado)
  }, [editor, deshabilitado])

  return (
    <div
      className={`focus-within:ring-ring/50 grid min-w-0 rounded-(--radius-md) border bg-(--color-surface) focus-within:ring-2 ${invalido ? 'border-(--color-peligro)' : 'border-(--color-line)'}`}
    >
      <BarraDelEditor editor={editor} deshabilitado={deshabilitado} />
      <EditorContent editor={editor} />
    </div>
  )
}
