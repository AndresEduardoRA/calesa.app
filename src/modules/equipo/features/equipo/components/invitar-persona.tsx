'use client'

import { useId, useRef, useState } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import type { Permisos } from '@/shared/lib/permisos'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import type { InvitacionHecha } from '../../../entities/invitacion'
import type { RolConConcesiones } from '../../../entities/rol'
import { useInvitaciones } from '../hooks/use-invitaciones'
import { FormularioInvitar } from './formulario-invitar'
import { ResultadoInvitacion } from './resultado-invitacion'

type Props = {
  abierto: boolean
  alCerrar: () => void
  roles: readonly RolConConcesiones[]
  misPermisos: Permisos
}

type Hecha = InvitacionHecha & { email: string }

// Invitar a alguien por correo con un rol. Primero el formulario; después, en el mismo diálogo,
// lo que pasó con la invitación (y el enlace, si hace falta pasarlo a mano).
export function InvitarPersona({ abierto, alCerrar, roles, misPermisos }: Props) {
  const idFormulario = useId()
  const formulario = useRef<HTMLFormElement>(null)
  const [hecha, setHecha] = useState<Hecha | null>(null)
  const { enviar, pedirEnlace, invitando, generando, errores } = useInvitaciones()

  function cerrar() {
    // El enlace no se guarda en ningún lado: al cerrar, el diálogo vuelve a empezar.
    setHecha(null)
    alCerrar()
  }

  async function invitar(datos: { email: string; nombre: string; rolId: string }) {
    const resultado = await enviar(datos)
    if (resultado) {
      setHecha({ ...resultado, email: datos.email.trim().toLowerCase() })
    } else {
      enfocarPrimerError(formulario.current)
    }
  }

  async function mostrarEnlace(invitacion: Hecha) {
    const enlace = await pedirEnlace(invitacion.personaId)
    if (enlace) {
      setHecha({ ...invitacion, enlace })
    }
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={cerrar}
      titulo={hecha ? 'Invitación creada' : 'Invitar a una persona'}
      descripcion={
        hecha
          ? undefined
          : 'Recibe un enlace para elegir su contraseña y entra con el rol que elijas.'
      }
      pie={
        hecha ? (
          <Button onClick={cerrar}>Listo</Button>
        ) : (
          <>
            <Button variant="outline" onClick={cerrar} disabled={invitando}>
              Cancelar
            </Button>
            <Button type="submit" form={idFormulario} disabled={invitando}>
              {invitando ? 'Invitando…' : 'Invitar'}
            </Button>
          </>
        )
      }
    >
      {hecha ? (
        <ResultadoInvitacion
          email={hecha.email}
          correoEnviado={hecha.correoEnviado}
          enlace={hecha.enlace}
          generando={generando}
          alPedirEnlace={() => void mostrarEnlace(hecha)}
        />
      ) : (
        <FormularioInvitar
          id={idFormulario}
          formulario={formulario}
          roles={roles}
          misPermisos={misPermisos}
          errores={errores}
          alEnviar={(datos) => void invitar(datos)}
        />
      )}
    </Modal>
  )
}
