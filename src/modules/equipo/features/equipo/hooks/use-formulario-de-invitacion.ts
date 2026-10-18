'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { motivosPorCampo } from '@/shared/lib/campos/esquema-de-valor'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { useEnvioDeModal } from '@/shared/ui/use-envio-de-modal'
import { MOTIVO_ROL_NO_DOMINADO } from '../../../entities/dominancia'
import type { InvitacionHecha } from '../../../entities/invitacion'
import { invitar } from '../actions/invitar'
import { esquemaInvitar } from '../schemas/equipo'

const MENSAJE_DE_VALIDACION = 'Revisa los campos marcados.'

export type InvitacionCreada = InvitacionHecha & { email: string }

type Args = {
  abierto: boolean
  // La invitación quedó hecha: el diálogo pasa a decir qué pasó con ella.
  alInvitar: (hecha: InvitacionCreada) => void
}

// El estado del modal «Invitar»: correo, nombre y rol, validados con el esquema de la action. Lo que rechaza el servidor se dice
// junto al campo que corresponde (el rol que quien invita no domina, el correo que ya aceptó); lo demás, arriba del formulario.
export function useFormularioDeInvitacion({ abierto, alInvitar }: Args) {
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [rolId, setRolId] = useState('')
  const invitando = useAction(invitar)

  const envio = useEnvioDeModal<InvitacionHecha>({
    abierto,
    hayCambios: email.trim() !== '' || nombre.trim() !== '' || rolId !== '',
    validar: () => {
      const revisado = esquemaInvitar.safeParse({ email: email.trim(), nombre, rolId })
      return revisado.success ? null : motivosPorCampo(revisado.error.issues)
    },
    pedir: () =>
      enviarAccion(
        invitando.executeAsync({ email: email.trim(), nombre, rolId }),
        MENSAJE_DE_VALIDACION,
      ),
    alGuardar: (hecha) => {
      alInvitar({ ...hecha, email: email.trim().toLowerCase() })
    },
    campoDelRechazo: (error) => {
      if (error.codigo === 'sin_permiso' && error.mensaje === MOTIVO_ROL_NO_DOMINADO) {
        return 'rolId'
      }
      return error.codigo === 'regla' || error.codigo === 'duplicado' ? 'email' : null
    },
  })

  const escribir = (clave: 'email' | 'nombre' | 'rolId', valor: string) => {
    if (clave === 'email') {
      setEmail(valor)
    } else if (clave === 'nombre') {
      setNombre(valor)
    } else {
      setRolId(valor)
    }
    envio.quitarMotivo(clave)
  }

  return { ...envio, email, nombre, rolId, escribir }
}
