'use client'

import { useId } from 'react'
import { Bloque } from '@/shared/ui/bloque'
import { Campo } from '@/shared/ui/campo'
import {
  MAXIMO_DEL_SLUG_DE_GUIA,
  MAXIMO_DEL_TITULO_DE_GUIA,
} from '../../../../entities/contenido/guias'
import type { DocumentoDelSitio } from '../../../../entities/contenido/documento-limpio'
import { EditorDeDocumentoDiferido } from '../../editor/components/editor-diferido'
import { CampoDeResumen } from './campo-de-resumen'
import type { ErroresDeGuia } from '../hooks/use-guardar-guia'
import type { ValoresDeGuia } from '../hooks/valores-de-guia'

type Props = {
  valores: ValoresDeGuia
  cambiar: (cambios: Partial<ValoresDeGuia>) => void
  errores: ErroresDeGuia
  // Por qué la lista blanca no admite el documento (lo dice la misma regla que la base), o nulo.
  motivoDelCuerpo: string | null
  deshabilitado: boolean
}

// Título, dirección, resumen y el texto de la guía con su editor.
export function BloqueContenido({
  valores,
  cambiar,
  errores,
  motivoDelCuerpo,
  deshabilitado,
}: Props) {
  const id = useId()
  const errorDelCuerpo = errores['cuerpo'] ?? motivoDelCuerpo ?? undefined
  return (
    <Bloque titulo="Contenido">
      <Campo
        nombre="titulo"
        etiqueta="Título"
        maxLength={MAXIMO_DEL_TITULO_DE_GUIA}
        autoComplete="off"
        value={valores.titulo}
        onChange={(evento) => {
          cambiar({ titulo: evento.target.value })
        }}
        error={errores['titulo']}
      />
      <Campo
        nombre="slug"
        etiqueta="Dirección"
        ayuda={`Es la dirección de la guía en el sitio: /guias/${valores.slug || '…'}. Si ya está publicada, cambiarla rompe los enlaces que la nombran.`}
        maxLength={MAXIMO_DEL_SLUG_DE_GUIA}
        autoComplete="off"
        value={valores.slug}
        onChange={(evento) => {
          cambiar({ slug: evento.target.value })
        }}
        error={errores['slug']}
      />
      <CampoDeResumen
        valor={valores.resumen}
        alCambiar={(resumen) => {
          cambiar({ resumen })
        }}
        error={errores['resumen']}
      />
      <div className="grid gap-1.5">
        <p id={`${id}-etiqueta`} className="text-sm leading-none font-medium text-(--color-ink)">
          Texto
        </p>
        <EditorDeDocumentoDiferido
          valor={valores.cuerpo}
          alCambiar={(cuerpo: DocumentoDelSitio | null) => {
            cambiar({ cuerpo })
          }}
          etiquetaId={`${id}-etiqueta`}
          errorId={errorDelCuerpo ? `${id}-error` : undefined}
          invalido={errorDelCuerpo !== undefined}
          deshabilitado={deshabilitado}
        />
        {errorDelCuerpo ? (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-(length:--text-sm) text-(--color-peligro-ink)"
          >
            {errorDelCuerpo}
          </p>
        ) : null}
      </div>
    </Bloque>
  )
}
