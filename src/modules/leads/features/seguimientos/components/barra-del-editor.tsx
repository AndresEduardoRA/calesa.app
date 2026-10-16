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
import { useState, type KeyboardEvent } from 'react'
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
  parada,
  alEnfocar,
}: {
  etiqueta: string
  Icono: LucideIcon
  activo: boolean
  alPulsar: () => void
  deshabilitado: boolean
  // La barra tiene una sola parada de Tab (la del botón con `parada`); las flechas recorren el resto.
  parada: boolean
  alEnfocar: () => void
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant={activo ? 'secondary' : 'ghost'}
      aria-label={etiqueta}
      title={etiqueta}
      aria-pressed={activo}
      tabIndex={parada ? 0 : -1}
      onFocus={alEnfocar}
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

// Las flechas, Inicio y Fin recorren los botones de la barra (el patrón «toolbar» de WAI-ARIA): con
// Tab se entra y se sale de la barra en una sola parada.
function moverEnLaBarra(evento: KeyboardEvent<HTMLDivElement>) {
  const claves = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
  if (!claves.includes(evento.key)) {
    return
  }
  const botones = Array.from(
    evento.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
  )
  const actual = botones.findIndex((boton) => boton === document.activeElement)
  if (actual < 0) {
    return
  }
  const ultimo = botones.length - 1
  const destino =
    evento.key === 'Home'
      ? 0
      : evento.key === 'End'
        ? ultimo
        : evento.key === 'ArrowRight'
          ? (actual + 1) % botones.length
          : (actual - 1 + botones.length) % botones.length
  evento.preventDefault()
  botones[destino]?.focus()
}

// Lo que se puede dar formato: negrita, cursiva, las dos listas y un enlace. Nada más.
export function BarraDelEditor({ editor, deshabilitado }: Props) {
  const [enlazando, setEnlazando] = useState(false)
  const [parada, setParada] = useState(0)
  const estado = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e ? { activos: FORMATOS.map((f) => f.activo(e)), enlace: enlaceActual(e) } : null,
  })
  const apagado = deshabilitado || editor === null
  const enlace = estado?.enlace ?? null
  return (
    <div className="grid border-b border-(--color-line)">
      <div
        role="toolbar"
        aria-label="Formato del detalle"
        aria-orientation="horizontal"
        className="flex flex-wrap gap-0.5 p-1"
        onKeyDown={moverEnLaBarra}
      >
        {FORMATOS.map((formato, n) => (
          <BotonDeFormato
            key={formato.etiqueta}
            etiqueta={formato.etiqueta}
            Icono={formato.Icono}
            activo={estado?.activos[n] ?? false}
            deshabilitado={apagado}
            parada={parada === n}
            alEnfocar={() => {
              setParada(n)
            }}
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
          parada={parada === FORMATOS.length}
          alEnfocar={() => {
            setParada(FORMATOS.length)
          }}
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
