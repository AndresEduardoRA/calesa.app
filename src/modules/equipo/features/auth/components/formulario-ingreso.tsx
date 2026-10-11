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
import { ingresar } from '../actions/ingresar'
import type { Aviso as AvisoDeAcceso } from '../../../entities/avisos'
import { BotonGoogle } from './boton-google'
import { EnlaceAcceso } from './enlace-acceso'

type Props = {
  returnTo?: string
  // Con el registro cerrado el enlace «Crear cuenta» directamente no está.
  conRegistro: boolean
  conGoogle: boolean
  // Por qué llegó acá redirigida (cuenta bloqueada, falla de Google, enlace vencido…).
  aviso: AvisoDeAcceso | null
}

export function FormularioIngreso({ returnTo, conRegistro, conGoogle, aviso }: Props) {
  const formulario = useRef<HTMLFormElement>(null)
  const { execute, result, isPending } = useAction(ingresar, {
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
      {!error && aviso ? <Aviso tono={aviso.tono}>{aviso.mensaje}</Aviso> : null}

      {conGoogle ? (
        <>
          <BotonGoogle returnTo={returnTo} />
          <p className="flex items-center gap-3 text-(length:--text-xs) text-(--color-ink-faint) before:h-px before:flex-1 before:bg-(--color-line) after:h-px after:flex-1 after:bg-(--color-line)">
            o con tu correo
          </p>
        </>
      ) : null}

      <form
        ref={formulario}
        noValidate
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          execute({ ...valoresDe(evento.currentTarget, ['email', 'contrasena']), returnTo })
        }}
      >
        <Campo
          nombre="email"
          etiqueta="Correo"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          error={errorDeCampo(campos, 'email')}
        />
        <Campo
          nombre="contrasena"
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          error={errorDeCampo(campos, 'contrasena')}
        />
        <Button type="submit" className="h-11 md:h-9" disabled={isPending}>
          {isPending ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <EnlaceAcceso href={RUTAS.recuperar}>Olvidé mi contraseña</EnlaceAcceso>
        {conRegistro ? <EnlaceAcceso href={RUTAS.registro}>Crear cuenta</EnlaceAcceso> : null}
      </div>
    </div>
  )
}
