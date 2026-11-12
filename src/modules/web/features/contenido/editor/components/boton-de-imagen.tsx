'use client'

import type { Editor } from '@tiptap/react'
import { ImageIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { subirImagenDelSitio } from '../subir-imagen.client'
import { BotonDeFormato } from './boton-de-formato'

// La imagen entra después del bloque del primer nivel donde está el cursor: la base no la admite adentro de una lista ni de una cita.
function insertarImagen(editor: Editor, ruta: string) {
  const { $to } = editor.state.selection
  const posicion = $to.depth === 0 ? $to.pos : $to.after(1)
  editor
    .chain()
    .focus()
    .insertContentAt(posicion, { type: 'image', attrs: { ruta, alt: '' } })
    .run()
}

type Props = {
  editor: Editor
  carpeta: string
  deshabilitado: boolean
  activo: boolean
  parada: boolean
  alEnfocar: () => void
}

// El botón «Imagen» de la barra: elige un archivo, lo sube al bucket `web` y lo inserta. Un fallo se dice junto a la barra, nunca en un toast perdido.
export function BotonDeImagen({
  editor,
  carpeta,
  deshabilitado,
  activo,
  parada,
  alEnfocar,
}: Props) {
  const selector = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function subir(archivo: File) {
    setError(null)
    setSubiendo(true)
    const subida = await subirImagenDelSitio(archivo, carpeta)
    setSubiendo(false)
    if (subida.ok) {
      insertarImagen(editor, subida.data.ruta)
    } else {
      setError(subida.error.mensaje)
    }
  }

  return (
    <>
      <BotonDeFormato
        etiqueta={subiendo ? 'Subiendo la imagen…' : 'Imagen'}
        Icono={ImageIcon}
        activo={activo}
        deshabilitado={deshabilitado || subiendo}
        parada={parada}
        alEnfocar={alEnfocar}
        alPulsar={() => selector.current?.click()}
      />
      <input
        ref={selector}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="Elegir una imagen"
        onChange={(evento) => {
          const archivo = evento.target.files?.[0]
          evento.target.value = ''
          if (archivo) {
            void subir(archivo)
          }
        }}
      />
      {error ? (
        <p role="alert" className="w-full px-1 text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
    </>
  )
}
