'use client'

import { Bloque } from '@/shared/ui/bloque'
import { Campo } from '@/shared/ui/campo'
import type { AjustesDelSitio } from '../../../../entities/sitio/ajustes'
import type { ErroresDeAjustesDelSitio } from '../hooks/use-guardar-ajustes-del-sitio'

type Props = { ajustes: AjustesDelSitio; errores: ErroresDeAjustesDelSitio }

// Dónde está la web y cómo se la contacta cuando no hay asesor.
export function BloqueContacto({ ajustes, errores }: Props) {
  return (
    <Bloque titulo="Contacto" descripcion="La dirección de la web y cómo se la contacta.">
      <Campo
        nombre="direccionPublica"
        etiqueta="Dirección pública"
        type="url"
        inputMode="url"
        placeholder="https://"
        defaultValue={ajustes.direccionPublica ?? ''}
        ayuda="Con https://. Va en el mensaje de WhatsApp con que el cliente entra al portal."
        error={errores['direccionPublica']}
      />
      <Campo
        nombre="whatsappRespaldo"
        etiqueta="WhatsApp de respaldo"
        type="tel"
        inputMode="tel"
        placeholder="+59170000000"
        defaultValue={ajustes.whatsappRespaldo ?? ''}
        ayuda="Con el código de país. La web lo ofrece cuando no hay un asesor para atender."
        error={errores['whatsappRespaldo']}
      />
      <Campo
        nombre="horario"
        etiqueta="Horario"
        maxLength={200}
        defaultValue={ajustes.horario ?? ''}
        error={errores['horario']}
      />
    </Bloque>
  )
}
