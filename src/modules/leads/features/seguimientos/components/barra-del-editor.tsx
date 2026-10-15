'use client'

import { useEditorState, type Editor } from '@tiptap/react'
import {
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { hrefSeguro } from '../../../entities/documento'
import { FormularioDeEnlace } from './formulario-de-enlace'

type Props = { editor: Editor | null; deshabilitado: boolean }

type Formato = {
  etiqueta: string
  Icono: LucideIcon
  activo: (e: Editor) => boolean
  aplicar: (e: Editor) => void
}

const FORMATOS: readonly Formato[] = [
  {
    etiqueta: 'Negrita',
    Icono: BoldIcon,
    activo: (e) => e.isActive('bold'),
    aplicar: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    etiqueta: 'Cursiva',
    Icono: ItalicIcon,
    activo: (e) => e.isActive('italic'),
    aplicar: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    etiqueta: 'Lista con viñetas',
    Icono: ListIcon,
    activo: (e) => e.isActive('bulletList'),
    aplicar: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    etiqueta: 'Lista numerada',
    Icono: ListOrderedIcon,
    activo: (e) => e.isActive('orderedList'),
    aplicar: (e) => e.chain().focus().toggleOrderedList().run(),
  },
]

function enlaceActual(editor: Editor): string | null {
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

function BotonDeFormato({
  etiqueta,
  Icono,
  activo,
  alPulsar,
  deshabilitado,
}: {
  etiqueta: string
  Icono: LucideIcon
  activo: boolean
  alPulsar: () => void
  deshabilitado: boolean
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant={activo ? 'secondary' : 'ghost'}
      aria-label={etiqueta}
      title={etiqueta}
      aria-pressed={activo}
      className="size-11 md:size-8"
      // Que el editor no pierda la selección al tocar el botón.
      onMouseDown={(evento) => {
        evento.preventDefault()
      }}
      onClick={alPulsar}
      disabled={deshabilitado}
    >
      <Icono aria-hidden className="size-4" />
    </Button>
  )
}

// Lo que se puede dar formato: negrita, cursiva, las dos listas y un enlace. Nada más.
export function BarraDelEditor({ editor, deshabilitado }: Props) {
  const [enlazando, setEnlazando] = useState(false)
  const estado = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e ? { activos: FORMATOS.map((f) => f.activo(e)), enlace: enlaceActual(e) } : null,
  })
  const apagado = deshabilitado || editor === null
  const enlace = estado?.enlace ?? null
  return (
    <div className="grid border-b border-(--color-line)">
      <div role="toolbar" aria-label="Formato del detalle" className="flex flex-wrap gap-0.5 p-1">
        {FORMATOS.map((formato, n) => (
          <BotonDeFormato
            key={formato.etiqueta}
            etiqueta={formato.etiqueta}
            Icono={formato.Icono}
            activo={estado?.activos[n] ?? false}
            deshabilitado={apagado}
            alPulsar={() => {
              if (editor) {
                formato.aplicar(editor)
              }
            }}
          />
        ))}
        <BotonDeFormato
          etiqueta="Enlace"
          Icono={LinkIcon}
          activo={enlazando || enlace !== null}
          deshabilitado={apagado}
          alPulsar={() => {
            setEnlazando((antes) => !antes)
          }}
        />
      </div>
      {enlazando && editor ? (
        <FormularioDeEnlace
          actual={enlace}
          validar={hrefSeguro}
          alAplicar={(href) => {
            aplicarEnlace(editor, href)
            setEnlazando(false)
          }}
          alQuitar={() => {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
            setEnlazando(false)
          }}
          alCerrar={() => {
            setEnlazando(false)
            editor.commands.focus()
          }}
        />
      ) : null}
    </div>
  )
}
