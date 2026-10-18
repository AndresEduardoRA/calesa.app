'use client'

import { useState } from 'react'
import type { Permisos } from '@/shared/lib/permisos'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useApertura } from '@/shared/ui/use-apertura'
import type { RolConConcesiones } from '../../../entities/rol'
import {
  useFormularioDeInvitacion,
  type InvitacionCreada,
} from '../hooks/use-formulario-de-invitacion'
import { useInvitaciones } from '../hooks/use-invitaciones'
import { FormularioInvitar } from './formulario-invitar'
import { ResultadoInvitacion } from './resultado-invitacion'

type Props = {
  abierto: boolean
  alCerrar: () => void
  roles: readonly RolConConcesiones[]
  misPermisos: Permisos
}

function FormularioDeInvitacion({
  abierto,
  alCerrar,
  alInvitar,
  roles,
  misPermisos,
}: Props & { alInvitar: (hecha: InvitacionCreada) => void }) {
  const formulario = useFormularioDeInvitacion({ abierto, alInvitar })
  return (
    <ModalDeFormulario
      id="invitar-persona"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Invitar a una persona"
      descripcion="Recibe un enlace para elegir su contraseña y entra con el rol que elijas."
      focoInicial={() => document.getElementById('email')}
      formulario={formulario}
      guardar={{ etiqueta: 'Invitar', enCurso: 'Invitando…' }}
    >
      <FormularioInvitar formulario={formulario} roles={roles} misPermisos={misPermisos} />
    </ModalDeFormulario>
  )
}

// Lo que pasó con la invitación (y el enlace, si hace falta pasarlo a mano): un modal aparte, que reemplaza al formulario.
function InvitacionHecha({
  hecha,
  alCerrar,
}: {
  hecha: InvitacionCreada | null
  alCerrar: () => void
}) {
  const { pedirEnlace, generando } = useInvitaciones()
  const [conEnlace, setConEnlace] = useState<{ personaId: string; enlace: string } | null>(null)
  // Lo último que se mostró, para que el modal se vaya con su contenido y no vacío.
  const [ultima, setUltima] = useState(hecha)
  if (hecha && hecha !== ultima) {
    setUltima(hecha)
    setConEnlace(null)
  }
  const mostrada = hecha ?? ultima
  const enlace = mostrada && conEnlace?.personaId === mostrada.personaId ? conEnlace.enlace : null

  async function mostrarEnlace(invitacion: InvitacionCreada) {
    const nuevo = await pedirEnlace(invitacion.personaId)
    if (nuevo) {
      setConEnlace({ personaId: invitacion.personaId, enlace: nuevo })
    }
  }

  return (
    <Modal
      abierto={hecha !== null}
      alCerrar={alCerrar}
      titulo="Invitación creada"
      alTerminarDeCerrar={() => {
        // El enlace no se guarda en ningún lado: al cerrar, el diálogo vuelve a empezar.
        setConEnlace(null)
        setUltima(null)
      }}
      pie={<Button onClick={alCerrar}>Listo</Button>}
    >
      {mostrada ? (
        <ResultadoInvitacion
          email={mostrada.email}
          correoEnviado={mostrada.correoEnviado}
          enlace={enlace ?? mostrada.enlace}
          generando={generando}
          alPedirEnlace={() => void mostrarEnlace(mostrada)}
        />
      ) : null}
    </Modal>
  )
}

// Invitar a alguien por correo con un rol. Primero el formulario (`ModalDeFormulario`: pregunta antes de descartar, no se
// cierra mientras guarda, sin conexión espera); hecha la invitación, otro modal dice qué pasó con ella.
export function InvitarPersona({ abierto, alCerrar, roles, misPermisos }: Props) {
  const apertura = useApertura(abierto)
  // Lo hecho vale para la apertura en que se hizo: cerrar con «atrás» y volver a abrir empieza de cero.
  const [hechaEn, setHechaEn] = useState<{ apertura: number; hecha: InvitacionCreada } | null>(null)
  const hecha = hechaEn?.apertura === apertura ? hechaEn.hecha : null

  function cerrar() {
    setHechaEn(null)
    alCerrar()
  }

  return (
    <>
      <FormularioDeInvitacion
        key={apertura}
        abierto={abierto && hecha === null}
        alCerrar={cerrar}
        alInvitar={(nueva) => {
          setHechaEn({ apertura, hecha: nueva })
        }}
        roles={roles}
        misPermisos={misPermisos}
      />
      <InvitacionHecha hecha={abierto ? hecha : null} alCerrar={cerrar} />
    </>
  )
}
