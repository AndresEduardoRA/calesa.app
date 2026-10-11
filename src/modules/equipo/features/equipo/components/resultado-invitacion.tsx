'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { EnlaceInvitacion } from './enlace-invitacion'

type Props = {
  email: string
  // Si Auth pudo mandar el correo.
  correoEnviado: boolean
  // El enlace para pasar a mano: viene solo si el correo falló, o después de pedirlo.
  enlace: string | null
  generando: boolean
  alPedirEnlace: () => void
}

// Lo que pasó con la invitación. Si el correo salió, el enlace se ofrece a pedido, porque
// generarlo deja sin efecto al del correo. Si no salió, el enlace ya está a la vista.
export function ResultadoInvitacion(props: Props) {
  const { email, correoEnviado, enlace, generando, alPedirEnlace } = props

  if (enlace) {
    return (
      <div className="grid gap-4">
        <Aviso tono={correoEnviado ? 'aviso' : 'info'}>
          {correoEnviado
            ? 'Este enlace reemplaza al del correo: el que le llegó ya no sirve.'
            : `No se pudo enviar el correo a ${email}. Pásale este enlace para que elija su contraseña.`}
        </Aviso>
        <EnlaceInvitacion enlace={enlace} />
      </div>
    )
  }

  if (!correoEnviado) {
    return (
      <Aviso tono="aviso">
        La cuenta de {email} quedó creada, pero no se pudo enviar el correo ni generar el enlace.
        Genera otro desde la lista del equipo.
      </Aviso>
    )
  }

  return (
    <div className="grid gap-4">
      <Aviso tono="positivo">
        Le enviamos la invitación a <strong>{email}</strong>. Al abrir el enlace elige su contraseña
        y entra con el rol que le diste.
      </Aviso>
      <div className="grid gap-1.5">
        <Button
          variant="outline"
          className="h-11 w-fit md:h-9"
          disabled={generando}
          onClick={alPedirEnlace}
        >
          {generando ? 'Generando…' : 'Copiar enlace'}
        </Button>
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          Para pasárselo por otro medio. Genera uno nuevo: el del correo deja de servir.
        </p>
      </div>
    </div>
  )
}
