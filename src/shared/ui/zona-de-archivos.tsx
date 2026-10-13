'use client'

import { CameraIcon, UploadIcon, type LucideIcon } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import { cn } from 'cn'
import { Button } from './button'

type Props = {
  // Qué ofrece el selector del sistema (`accept`). Lo que se suelta no pasa por ese filtro: quien
  // recibe los archivos es quien los valida.
  aceptar: string
  // Los archivos elegidos, soltados o recién sacados con la cámara. Acá no se sube nada.
  alElegir: (archivos: File[]) => void
  // El componente no sabe qué se sube: las palabras las pone quien lo usa.
  etiquetaDeElegir: string
  // Con esto, en una pantalla táctil aparece el botón que abre la cámara.
  etiquetaDeCamara?: string
  ayuda?: ReactNode
  deshabilitada?: boolean
  className?: string
}

type PropsDeSelector = {
  etiqueta: string
  Icono: LucideIcon
  aceptar: string
  deshabilitado?: boolean
  // La cámara de atrás: en un celular abre la cámara en vez del selector.
  camara?: boolean
  alCambiar: (evento: ChangeEvent<HTMLInputElement>) => void
  className?: string
}

// Un botón que abre un selector de archivos. El `<input>` es sólo el mecanismo.
function Selector(props: PropsDeSelector) {
  const { etiqueta, Icono, aceptar, deshabilitado, camara, alCambiar } = props
  const entrada = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={entrada}
        type="file"
        multiple={!camara}
        accept={aceptar}
        capture={camara ? 'environment' : undefined}
        // Para quien usa teclado o lector de pantalla el control es el botón de al lado: un
        // `<input type="file">` se anuncia como otro botón con el mismo nombre.
        aria-hidden
        tabIndex={-1}
        disabled={deshabilitado}
        className="sr-only"
        onChange={alCambiar}
      />
      <Button
        type="button"
        variant="outline"
        className={cn('h-11 md:h-8', props.className)}
        disabled={deshabilitado}
        onClick={() => entrada.current?.click()}
      >
        <Icono aria-hidden data-icon="inline-start" />
        {etiqueta}
      </Button>
    </>
  )
}

// Elegir varios archivos: con el selector, soltándolos encima o, en el celular, con la cámara.
// Sólo los entrega: subirlos es de quien confirma (commit diferido).
export function ZonaDeArchivos(props: Props) {
  const { aceptar, alElegir, etiquetaDeElegir, etiquetaDeCamara, ayuda, deshabilitada } = props
  const [encima, setEncima] = useState(false)

  function alCambiar(evento: ChangeEvent<HTMLInputElement>) {
    const archivos = [...(evento.target.files ?? [])]
    // Sin esto, elegir dos veces el mismo archivo no avisa la segunda.
    evento.target.value = ''
    if (archivos.length > 0) {
      alElegir(archivos)
    }
  }

  function alSoltar(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault()
    setEncima(false)
    const archivos = [...evento.dataTransfer.files]
    if (!deshabilitada && archivos.length > 0) {
      alElegir(archivos)
    }
  }

  return (
    <div
      role="group"
      aria-label={etiquetaDeElegir}
      onDragOver={(evento) => {
        // Sin esto el navegador abre el archivo en vez de soltarlo acá.
        evento.preventDefault()
        setEncima(!deshabilitada)
      }}
      onDragLeave={() => {
        setEncima(false)
      }}
      onDrop={alSoltar}
      className={cn(
        'grid justify-items-center gap-2 rounded-(--radius-card) border border-dashed border-(--color-line) bg-(--color-surface) px-4 py-5 text-center transition-colors',
        encima && 'border-(--color-primario) bg-(--color-primario-soft)',
        props.className,
      )}
    >
      <div className="flex flex-wrap justify-center gap-2">
        <Selector
          etiqueta={etiquetaDeElegir}
          Icono={UploadIcon}
          aceptar={aceptar}
          deshabilitado={deshabilitada}
          alCambiar={alCambiar}
        />
        {etiquetaDeCamara ? (
          <Selector
            etiqueta={etiquetaDeCamara}
            Icono={CameraIcon}
            aceptar={aceptar}
            deshabilitado={deshabilitada}
            camara
            alCambiar={alCambiar}
            // Sólo donde se toca la pantalla: en un escritorio abriría el mismo selector.
            className="hidden pointer-coarse:inline-flex"
          />
        ) : null}
      </div>
      {ayuda ? (
        <p className="max-w-md text-(length:--text-sm) text-(--color-ink-soft)">{ayuda}</p>
      ) : null}
    </div>
  )
}
