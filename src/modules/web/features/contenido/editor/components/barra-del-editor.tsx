'use client'

import { useEditorState, type Editor } from '@tiptap/react'
import {
  BoldIcon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { BotonDeFormato, moverEnLaBarra } from './boton-de-formato'
import { BotonDeImagen } from './boton-de-imagen'
import { DescripcionDeLaImagen } from './descripcion-de-la-imagen'
import { enlaceActual, PanelDelEnlace } from './panel-del-enlace'

type Props = {
  editor: Editor | null
  deshabilitado: boolean
  // Sin imágenes (los legales): no hay botón.
  imagenes: boolean
  // La carpeta del bucket `web` donde se suben las imágenes del documento.
  carpetaDeImagenes: string
}

type Formato = {
  etiqueta: string
  Icono: LucideIcon
  activo: (e: Editor) => boolean
  aplicar: (e: Editor) => void
}

const FORMATOS: readonly Formato[] = [
  {
    etiqueta: 'Título grande',
    Icono: Heading2Icon,
    activo: (e) => e.isActive('heading', { level: 2 }),
    aplicar: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    etiqueta: 'Título chico',
    Icono: Heading3Icon,
    activo: (e) => e.isActive('heading', { level: 3 }),
    aplicar: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
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
  {
    etiqueta: 'Cita',
    Icono: QuoteIcon,
    activo: (e) => e.isActive('blockquote'),
    aplicar: (e) => e.chain().focus().toggleBlockquote().run(),
  },
]

const SIN_ESTADO = { activos: [] as boolean[], enlace: null as string | null, imagen: false }

// Títulos, negrita, cursiva, listas, cita, enlace e imagen: lo que la lista blanca del sitio admite, nada más.
export function BarraDelEditor({ editor, deshabilitado, imagenes, carpetaDeImagenes }: Props) {
  const [enlazando, setEnlazando] = useState(false)
  const [parada, setParada] = useState(0)
  const lectura = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      activos: FORMATOS.map((formato) => (e ? formato.activo(e) : false)),
      enlace: e ? enlaceActual(e) : null,
      imagen: e ? e.isActive('image') : false,
    }),
  })
  const estado = lectura ?? SIN_ESTADO
  const apagado = deshabilitado || editor === null
  const enlace = estado.enlace

  return (
    <div className="grid border-b border-(--color-line)">
      <div
        role="toolbar"
        aria-label="Formato del texto"
        aria-orientation="horizontal"
        className="flex flex-wrap gap-0.5 p-1"
        onKeyDown={moverEnLaBarra}
      >
        {FORMATOS.map((formato, n) => (
          <BotonDeFormato
            key={formato.etiqueta}
            etiqueta={formato.etiqueta}
            Icono={formato.Icono}
            activo={estado.activos[n] === true}
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
        {imagenes && editor ? (
          <BotonDeImagen
            editor={editor}
            carpeta={carpetaDeImagenes}
            deshabilitado={deshabilitado}
            activo={estado.imagen}
            parada={parada === FORMATOS.length + 1}
            alEnfocar={() => {
              setParada(FORMATOS.length + 1)
            }}
          />
        ) : null}
      </div>
      {estado.imagen && editor ? <DescripcionDeLaImagen editor={editor} /> : null}
      {enlazando && editor ? (
        <PanelDelEnlace
          editor={editor}
          cerrar={() => {
            setEnlazando(false)
          }}
        />
      ) : null}
    </div>
  )
}
