'use client'

import { EditorContent, Extension, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'
import { hrefSeguro } from '../../../../entities/contenido/doc'
import {
  documentoLimpio,
  type DocumentoDelSitio,
} from '../../../../entities/contenido/documento-limpio'
import { ImagenDelSitio } from '../imagen'
import { BarraDelEditor } from './barra-del-editor'

export type PropsDelEditorDeDocumento = {
  valor: DocumentoDelSitio | null
  alCambiar: (documento: DocumentoDelSitio | null) => void
  // El id de la etiqueta visible («Texto»).
  etiquetaId: string
  // El id del motivo bajo el campo, si lo hay.
  errorId?: string
  invalido: boolean
  deshabilitado: boolean
  // Con botón de imagen (las guías); sin él, los legales (la base los rechaza con imágenes).
  imagenes?: boolean
  carpetaDeImagenes?: string
}

// `Ctrl/Cmd+Enter` es «guardar» en toda la app: acá adentro no inserta un salto (el salto es `Shift+Enter`).
const SinSaltoConModEnter = Extension.create({
  name: 'sinSaltoConModEnter',
  priority: 1000,
  addKeyboardShortcuts() {
    return { 'Mod-Enter': () => true }
  },
})

const LINK = {
  openOnClick: false,
  autolink: true,
  linkOnPaste: true,
  defaultProtocol: 'https',
  protocols: ['mailto', 'tel'],
  isAllowedUri: (url: string) => hrefSeguro(url) !== null,
  HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: null, class: null },
}

// Sólo lo que la lista blanca del sitio admite: títulos 2 y 3, párrafos, negrita, cursiva, las dos listas, la cita, enlaces y la imagen.
// Lo demás de StarterKit, apagado; lo que se pega pasa por este esquema y se cae lo que no está.
const EXTENSIONES = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    dropcursor: false,
    link: LINK,
  }),
  ImagenDelSitio,
  SinSaltoConModEnter,
]

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// El editor de las guías (y, después, de los legales): no sabe nada de ellos. Lo que sale ya está reducido a la lista blanca
// (`documentoLimpio`). Se carga aparte (`editor-diferido`): ni el hub de Configuración ni la lista pagan Tiptap.
export function EditorDeDocumento({
  valor,
  alCambiar,
  etiquetaId,
  errorId,
  invalido,
  deshabilitado,
  imagenes = true,
  carpetaDeImagenes = 'guias',
}: PropsDelEditorDeDocumento) {
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
          'documento-de-seguimiento documento-del-sitio min-h-64 px-3 py-2 text-(length:--text-sm) text-(--color-ink) outline-none [&_blockquote]:border-s-4 [&_blockquote]:border-(--color-line) [&_blockquote]:ps-3 [&_blockquote]:text-(--color-ink-soft) [&_h2]:mt-3 [&_h2]:text-(length:--text-lg) [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:font-semibold',
      },
    },
    onUpdate: ({ editor: e }) => {
      alCambiar(documentoLimpio(e.getJSON()))
    },
  })

  // Lo que cambia desde afuera (un borrador que se repone, «Recargar» tras un conflicto).
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
      <BarraDelEditor
        editor={editor}
        deshabilitado={deshabilitado}
        imagenes={imagenes}
        carpetaDeImagenes={carpetaDeImagenes}
      />
      <EditorContent editor={editor} />
    </div>
  )
}
