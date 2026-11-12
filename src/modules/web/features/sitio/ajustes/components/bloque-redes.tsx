'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Bloque } from '@/shared/ui/bloque'
import { Campo } from '@/shared/ui/campo'
import {
  REDES_DEL_SITIO,
  type AjustesDelSitio,
  type RedDelSitio,
} from '../../../../entities/sitio/ajustes'
import type { ErroresDeAjustesDelSitio } from '../hooks/use-guardar-ajustes-del-sitio'

type Props = { ajustes: AjustesDelSitio; errores: ErroresDeAjustesDelSitio }

const ETIQUETA: Record<RedDelSitio, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  x: 'X',
  linkedin: 'LinkedIn',
}

// Las redes que la web enlaza. Nace plegado y se abre si algo de adentro tiene error; el de la base (`hint` = `redes`) va arriba.
export function BloqueRedes({ ajustes, errores }: Props) {
  const conError =
    errores['redes'] !== undefined || REDES_DEL_SITIO.some((red) => errores[red] !== undefined)
  return (
    <Bloque
      titulo="Redes"
      descripcion="Las que quedan vacías no se muestran."
      plegado
      forzarAbierto={conError}
    >
      {errores['redes'] ? <Aviso tono="peligro">{errores['redes']}</Aviso> : null}
      {REDES_DEL_SITIO.map((red) => (
        <Campo
          key={red}
          nombre={red}
          etiqueta={ETIQUETA[red]}
          type="url"
          inputMode="url"
          placeholder="https://"
          defaultValue={ajustes.redes[red] ?? ''}
          error={errores[red]}
        />
      ))}
    </Bloque>
  )
}
