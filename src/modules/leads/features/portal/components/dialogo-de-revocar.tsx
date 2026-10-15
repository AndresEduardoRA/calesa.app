'use client'

import { useAction } from 'next-safe-action/hooks'
import { useEffect, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'
import { avisarExito } from '@/shared/ui/toasts'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { revocarPortal } from '../actions/revocar-portal'

type Props = {
  abierto: boolean
  alCerrar: () => void
  leadId: string
  leadNombre: string
  codigo: string
}

// «Revocar» (`?panel=revocar-portal`): irreversible (un «Deshacer» reabriría un código revocado), así
// que se confirma nombrando el código. Es inmediato e idempotente: la sesión abierta del cliente se
// corta en ese momento.
export function DialogoDeRevocar({ abierto, alCerrar, leadId, leadNombre, codigo }: Props) {
  const accion = useAction(revocarPortal)
  const [error, setError] = useState<ErrorApp | null>(null)
  useEffect(() => {
    if (!abierto) {
      return
    }
    return () => {
      setError(null)
    }
  }, [abierto])

  async function revocar() {
    setError(null)
    const envio = await enviarAccion(accion.executeAsync({ leadId }), MENSAJE_DE_VALIDACION)
    if (!envio.ok) {
      setError(envio.error)
      return
    }
    avisarExito(`Se revocó el acceso de ${leadNombre} al portal.`)
    alCerrar()
  }

  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={() => void revocar()}
      titulo={`Revocar el acceso de ${leadNombre}`}
      descripcion={`El código ${codigo} deja de valer ahora y, si el cliente tiene la sesión abierta, se cierra. Para volver a darle acceso hay que otorgarle uno nuevo.`}
      etiquetaConfirmar={accion.isExecuting ? 'Revocando…' : 'Revocar acceso'}
      enCurso={accion.isExecuting}
    >
      {error ? <Aviso tono="peligro">{error.mensaje}</Aviso> : null}
    </Confirmar>
  )
}
