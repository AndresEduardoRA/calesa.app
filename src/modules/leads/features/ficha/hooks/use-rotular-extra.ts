'use client'

import { useState } from 'react'
import type { TelefonoExtra } from '../../../entities/ficha'
import { CLAVE_DE_TELEFONO, validarExtra } from '../../../entities/telefonos'
import type { TelefonosExtra } from './use-telefonos-extra'

type Args = {
  extra: TelefonoExtra
  guardar: TelefonosExtra['guardar']
  alCerrar: () => void
}

// Rotular un extra: cambia sólo la etiqueta (para otro número se quita éste y se agrega el nuevo).
// Vaciarla la deja nula. Guardar la misma etiqueta no cambia nada.
export function useRotularExtra({ extra, guardar, alCerrar }: Args) {
  const [etiqueta, setEtiqueta] = useState(extra.etiqueta ?? '')
  const [error, setError] = useState<string | undefined>(undefined)
  const [enCurso, setEnCurso] = useState(false)

  async function enviar() {
    if (enCurso) {
      return
    }
    const validado = validarExtra({
      codigoDePais: null,
      telefono: extra.telefono,
      etiqueta,
      principal: '',
      extras: [],
      rotulando: extra,
    })
    if (!validado.ok) {
      setError(validado.porCampo[CLAVE_DE_TELEFONO.etiqueta])
      return
    }
    setEnCurso(true)
    // El número ya está normalizado: con el «+» la base lo toma tal cual.
    const envio = await guardar({
      id: extra.id,
      telefono: `+${extra.telefono}`,
      etiqueta: validado.etiqueta,
    })
    setEnCurso(false)
    if (envio.ok) {
      alCerrar()
    } else if ('sinRed' in envio) {
      setError('No pudimos llegar al servidor. Vuelve a intentar.')
    } else {
      setError(envio.porCampo?.[CLAVE_DE_TELEFONO.etiqueta] ?? envio.error.mensaje)
    }
  }

  return {
    etiqueta,
    error,
    enCurso,
    escribir: (valor: string) => {
      setEtiqueta(valor)
      setError(undefined)
    },
    enviar,
  }
}
