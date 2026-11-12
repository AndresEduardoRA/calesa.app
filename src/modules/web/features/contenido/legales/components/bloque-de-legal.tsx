'use client'

import { useId } from 'react'
import { formatearFecha } from '@/shared/lib/fechas'
import { Bloque } from '@/shared/ui/bloque'
import { Campo } from '@/shared/ui/campo'
import { useRegional } from '@/shared/ui/regional'
import type { DocumentoDelSitio } from '../../../../entities/contenido/documento-limpio'
import { htmlDelDocumento } from '../../../../entities/contenido/doc'
import {
  MAXIMO_DEL_TITULO_LEGAL,
  TEXTOS_DE_LEGALES,
  type ClaveDeLegal,
} from '../../../../entities/contenido/legales'
import { EditorDeDocumentoDiferido } from '../../editor/components/editor-diferido'

type Props = {
  clave: ClaveDeLegal
  titulo: string
  documento: DocumentoDelSitio | null
  alCambiar: (cambios: { titulo?: string; documento?: DocumentoDelSitio | null }) => void
  errorDelTitulo: string | undefined
  errorDelTexto: string | undefined
  // Cuándo se guardó este documento por última vez (ISO), o nulo si aún no existe.
  guardadoEn: string | null
  deshabilitado: boolean
}

// Un documento legal: su título y su texto con el mismo editor de las guías, sin imágenes (la base las rechaza). El nombre del editor es propio de
// cada documento: con los dos en la pantalla, el mismo nombre accesible no serviría para distinguirlos.
export function BloqueDeLegal({
  clave,
  titulo,
  documento,
  alCambiar,
  errorDelTitulo,
  errorDelTexto,
  guardadoEn,
  deshabilitado,
}: Props) {
  const id = useId()
  const { zonaHoraria } = useRegional()
  const textos = TEXTOS_DE_LEGALES[clave]
  const html = htmlDelDocumento(documento)
  const error = errorDelTexto ?? (html.ok ? undefined : html.motivo)
  return (
    <Bloque
      titulo={textos.titulo}
      descripcion={
        guardadoEn
          ? `Guardado el ${formatearFecha(guardadoEn, { zona: zonaHoraria })}.`
          : 'Todavía no se guardó.'
      }
    >
      <Campo
        nombre={`${clave}-titulo`}
        etiqueta="Título"
        maxLength={MAXIMO_DEL_TITULO_LEGAL}
        autoComplete="off"
        value={titulo}
        onChange={(evento) => {
          alCambiar({ titulo: evento.target.value })
        }}
        error={errorDelTitulo}
      />
      <div className="grid gap-1.5">
        <p id={`${id}-etiqueta`} className="text-sm leading-none font-medium text-(--color-ink)">
          {textos.editor}
        </p>
        <EditorDeDocumentoDiferido
          valor={documento}
          alCambiar={(nuevo: DocumentoDelSitio | null) => {
            alCambiar({ documento: nuevo })
          }}
          etiquetaId={`${id}-etiqueta`}
          errorId={error ? `${id}-error` : undefined}
          invalido={error !== undefined}
          deshabilitado={deshabilitado}
          imagenes={false}
        />
        {error ? (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-(length:--text-sm) text-(--color-peligro-ink)"
          >
            {error}
          </p>
        ) : null}
      </div>
    </Bloque>
  )
}
