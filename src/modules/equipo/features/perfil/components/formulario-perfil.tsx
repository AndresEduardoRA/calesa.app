'use client'

import { useRef, useState } from 'react'
import { errorDeCampo, valoresDe } from '@/shared/lib/formularios'
import { Bloque } from '@/shared/ui/bloque'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { useGuardarPerfil, type CambioDeFoto } from '../hooks/use-guardar-perfil'
import { FotoPerfil } from './foto-perfil'

type Props = {
  usuarioId: string
  nombre: string
  email: string
  avatarRuta: string | null
  // URL pública de `avatarRuta`, ya armada en el servidor.
  avatarUrl: string | null
  // ISO: el `actualizado_en` del perfil al abrir la pantalla.
  actualizadoEn: string
}

export function FormularioPerfil(props: Props) {
  const { usuarioId, nombre, email, avatarRuta, avatarUrl, actualizadoEn } = props
  const formulario = useRef<HTMLFormElement>(null)
  const [foto, setFoto] = useState<CambioDeFoto>({ tipo: 'igual' })
  const { guardar, enCurso, errores } = useGuardarPerfil({
    usuarioId,
    avatarRuta,
    actualizadoEn,
    formulario,
  })

  return (
    <form
      ref={formulario}
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault()
        const { nombre: nuevoNombre } = valoresDe(evento.currentTarget, ['nombre'])
        void guardar(nuevoNombre, foto).then((quedoGuardado) => {
          if (quedoGuardado) {
            setFoto({ tipo: 'igual' })
          }
        })
      }}
    >
      <Bloque titulo="Tus datos" descripcion="Así te ve el resto del equipo.">
        <FotoPerfil
          nombre={nombre}
          urlActual={avatarUrl}
          cambio={foto}
          alCambiar={setFoto}
          deshabilitado={enCurso}
        />
        <Campo
          nombre="nombre"
          etiqueta="Nombre y apellido"
          autoComplete="name"
          defaultValue={nombre}
          error={errorDeCampo(errores, 'nombre')}
        />
        <Campo
          nombre="email"
          etiqueta="Correo"
          type="email"
          defaultValue={email}
          readOnly
          ayuda="Es el correo con el que ingresas. No se cambia desde acá."
        />
        <div>
          <Button type="submit" className="h-11 md:h-9" disabled={enCurso}>
            {enCurso ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </Bloque>
    </form>
  )
}
