'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Bloque } from '@/shared/ui/bloque'
import { Campo } from '@/shared/ui/campo'
import type { AjustesDelSitio } from '../../../../entities/sitio/ajustes'
import type { ErroresDeAjustesDelSitio } from '../hooks/use-guardar-ajustes-del-sitio'

type Props = { ajustes: AjustesDelSitio; errores: ErroresDeAjustesDelSitio }

// Lo que muestran los buscadores de la portada. Nace plegado y se abre con un error; el de la base (`hint` = `seo`) va arriba.
export function BloqueBuscadores({ ajustes, errores }: Props) {
  const conError =
    errores['seo'] !== undefined ||
    errores['seoTitulo'] !== undefined ||
    errores['seoDescripcion'] !== undefined
  return (
    <Bloque
      titulo="Buscadores"
      descripcion="Cómo aparece la web en Google y al compartirla."
      plegado
      forzarAbierto={conError}
    >
      {errores['seo'] ? <Aviso tono="peligro">{errores['seo']}</Aviso> : null}
      <Campo
        nombre="seoTitulo"
        etiqueta="Título para buscadores"
        maxLength={70}
        defaultValue={ajustes.seo.titulo ?? ''}
        error={errores['seoTitulo']}
      />
      <Campo
        nombre="seoDescripcion"
        etiqueta="Descripción para buscadores"
        maxLength={160}
        defaultValue={ajustes.seo.descripcion ?? ''}
        error={errores['seoDescripcion']}
      />
    </Bloque>
  )
}
