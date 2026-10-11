'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRef } from 'react'
import {
  enfocarPrimerError,
  errorDeAccion,
  errorDeCampo,
  valoresDe,
} from '@/shared/lib/formularios'
import { RUTAS } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { registrarse } from '../actions/registrarse'
import { LARGO_MINIMO_CONTRASENA } from '../schemas/acceso'
import { EnlaceAcceso } from './enlace-acceso'

type Props = {
  // Todavía no hay nadie en el equipo: esta cuenta nace con el rol de dueño.
  primerRegistro: boolean
}

export function FormularioRegistro({ primerRegistro }: Props) {
  const formulario = useRef<HTMLFormElement>(null)
  const { execute, result, isPending } = useAction(registrarse, {
    onError: () => {
      enfocarPrimerError(formulario.current)
    },
  })
  // Mientras viaja un intento nuevo no se muestra el resultado del anterior.
  const error = isPending ? null : errorDeAccion(result)
  const campos = isPending ? undefined : result.validationErrors?.fieldErrors

  return (
    <div className="grid gap-5">
      {error ? <Aviso tono="peligro">{error.mensaje}</Aviso> : null}
      {!error && primerRegistro ? (
        <Aviso tono="info">
          Es la primera cuenta de esta instalación: nace con el rol de dueño y después puede invitar
          al resto del equipo.
        </Aviso>
      ) : null}

      <form
        ref={formulario}
        noValidate
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          execute(valoresDe(evento.currentTarget, ['nombre', 'email', 'contrasena']))
        }}
      >
        <Campo
          nombre="nombre"
          etiqueta="Nombre y apellido"
          autoComplete="name"
          autoFocus
          error={errorDeCampo(campos, 'nombre')}
        />
        <Campo
          nombre="email"
          etiqueta="Correo"
          type="email"
          inputMode="email"
          autoComplete="email"
          error={errorDeCampo(campos, 'email')}
        />
        <Campo
          nombre="contrasena"
          etiqueta="Contraseña"
          type="password"
          autoComplete="new-password"
          ayuda={`Al menos ${String(LARGO_MINIMO_CONTRASENA)} caracteres.`}
          error={errorDeCampo(campos, 'contrasena')}
        />
        <Button type="submit" className="h-11 md:h-9" disabled={isPending}>
          {isPending ? 'Creando la cuenta…' : 'Crear cuenta'}
        </Button>
      </form>

      <EnlaceAcceso href={RUTAS.ingreso}>Ya tengo cuenta</EnlaceAcceso>
    </div>
  )
}
