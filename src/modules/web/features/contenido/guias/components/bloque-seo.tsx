'use client'

import { Bloque } from '@/shared/ui/bloque'
import { Campo } from '@/shared/ui/campo'
import {
  MAXIMO_DEL_SEO_DESCRIPCION,
  MAXIMO_DEL_SEO_TITULO,
} from '../../../../entities/contenido/guias'
import type { ErroresDeGuia } from '../hooks/use-guardar-guia'
import type { ValoresDeGuia } from '../hooks/valores-de-guia'

type Props = {
  valores: ValoresDeGuia
  cambiar: (cambios: Partial<ValoresDeGuia>) => void
  errores: ErroresDeGuia
}

// El título y la descripción que ven los buscadores; vacíos, el sitio usa el título y el resumen.
export function BloqueSeo({ valores, cambiar, errores }: Props) {
  return (
    <Bloque
      titulo="Para buscadores"
      descripcion="Vacíos, se usan el título y el resumen de la guía."
      plegado
    >
      <Campo
        nombre="seoTitulo"
        etiqueta="Título para buscadores"
        ayuda={`${String(valores.seoTitulo.length)} de ${String(MAXIMO_DEL_SEO_TITULO)} letras.`}
        maxLength={MAXIMO_DEL_SEO_TITULO}
        autoComplete="off"
        value={valores.seoTitulo}
        onChange={(evento) => {
          cambiar({ seoTitulo: evento.target.value })
        }}
        error={errores['seoTitulo']}
      />
      <Campo
        nombre="seoDescripcion"
        etiqueta="Descripción para buscadores"
        ayuda={`${String(valores.seoDescripcion.length)} de ${String(MAXIMO_DEL_SEO_DESCRIPCION)} letras.`}
        maxLength={MAXIMO_DEL_SEO_DESCRIPCION}
        autoComplete="off"
        value={valores.seoDescripcion}
        onChange={(evento) => {
          cambiar({ seoDescripcion: evento.target.value })
        }}
        error={errores['seoDescripcion']}
      />
    </Bloque>
  )
}
