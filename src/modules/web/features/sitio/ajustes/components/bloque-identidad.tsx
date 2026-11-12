'use client'

import { Bloque } from '@/shared/ui/bloque'
import { Campo } from '@/shared/ui/campo'
import type { AjustesDelSitio } from '../../../../entities/sitio/ajustes'
import type { ErroresDeAjustesDelSitio } from '../hooks/use-guardar-ajustes-del-sitio'

type Props = { ajustes: AjustesDelSitio; errores: ErroresDeAjustesDelSitio }

// El nombre y el lema con que la web se presenta.
export function BloqueIdentidad({ ajustes, errores }: Props) {
  return (
    <Bloque titulo="Identidad" descripcion="Cómo se presenta la web.">
      <Campo
        nombre="nombreSitio"
        etiqueta="Nombre del sitio"
        maxLength={80}
        defaultValue={ajustes.nombreSitio ?? ''}
        error={errores['nombreSitio']}
      />
      <Campo
        nombre="lema"
        etiqueta="Lema"
        maxLength={160}
        defaultValue={ajustes.lema ?? ''}
        error={errores['lema']}
      />
    </Bloque>
  )
}
