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
import { fijarContrasena } from '../actions/fijar-contrasena'
import { LARGO_MINIMO_CONTRASENA } from '../schemas/acceso'
import { EnlaceAcceso } from './enlace-acceso'

// Lo usa quien recupera la contraseña y quien llega invitado: los dos entran con la sesión que
// les dejó su enlace y eligen la contraseña acá.
export function FormularioNuevaContrasena() {
  const formulario = useRef<HTMLFormElement>(null)
  const { execute, result, isPending } = useAction(fijarContrasena, {
    onError: () => {
      enfocarPrimerError(formulario.current)
    },
  })
  // Mientras viaja un intento nuevo no se muestra el resultado del anterior.
  const error = isPending ? null : errorDeAccion(result)
  const campos = isPending ? undefined : result.validationErrors?.fieldErrors
  // La sesión del enlace dura una hora: si venció con el formulario abierto, hay que pedir otro.
  const sesionVencida = error?.codigo === 'no_autenticado'

  return (
    <div className="grid gap-5">
      {error ? (
        <Aviso tono="peligro">
          {sesionVencida
            ? 'El enlace venció mientras esta pantalla estaba abierta.'
            : error.mensaje}
        </Aviso>
      ) : null}

      <form
        ref={formulario}
        noValidate
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          execute(valoresDe(evento.currentTarget, ['contrasena', 'repetida']))
        }}
      >
        <Campo
          nombre="contrasena"
          etiqueta="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          autoFocus
          ayuda={`Al menos ${String(LARGO_MINIMO_CONTRASENA)} caracteres.`}
          error={errorDeCampo(campos, 'contrasena')}
        />
        <Campo
          nombre="repetida"
          etiqueta="Repetir la contraseña"
          type="password"
          autoComplete="new-password"
          error={errorDeCampo(campos, 'repetida')}
        />
        <Button type="submit" className="h-11 md:h-9" disabled={isPending}>
          {isPending ? 'Guardando…' : 'Guardar y entrar'}
        </Button>
      </form>

      {sesionVencida ? (
        <EnlaceAcceso href={RUTAS.recuperar}>Pedir un enlace nuevo</EnlaceAcceso>
      ) : null}
    </div>
  )
}
