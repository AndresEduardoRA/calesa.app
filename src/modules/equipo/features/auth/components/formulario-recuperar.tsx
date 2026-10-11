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
import { pedirRecuperacion } from '../actions/pedir-recuperacion'
import type { Aviso as AvisoDeAcceso } from '../../../entities/avisos'
import { EnlaceAcceso } from './enlace-acceso'

export function FormularioRecuperar({ aviso }: { aviso: AvisoDeAcceso | null }) {
  const formulario = useRef<HTMLFormElement>(null)
  const { execute, result, isPending } = useAction(pedirRecuperacion, {
    onError: () => {
      enfocarPrimerError(formulario.current)
    },
  })
  // Mientras viaja un intento nuevo no se muestra el resultado del anterior.
  const error = isPending ? null : errorDeAccion(result)

  if (result.data?.ok) {
    return (
      <div className="grid gap-4">
        {/* Dice lo mismo exista o no la cuenta: esta pantalla no sirve para averiguar correos. */}
        <Aviso tono="positivo">
          Si hay una cuenta con <strong>{result.data.data.email}</strong>, en unos minutos llega un
          correo con el enlace para elegir una contraseña nueva. Vence en una hora.
        </Aviso>
        <EnlaceAcceso href={RUTAS.ingreso}>Volver al ingreso</EnlaceAcceso>
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      {error ? <Aviso tono="peligro">{error.mensaje}</Aviso> : null}
      {!error && aviso ? <Aviso tono={aviso.tono}>{aviso.mensaje}</Aviso> : null}

      <form
        ref={formulario}
        noValidate
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          execute(valoresDe(evento.currentTarget, ['email']))
        }}
      >
        <Campo
          nombre="email"
          etiqueta="Correo de tu cuenta"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          error={
            isPending ? undefined : errorDeCampo(result.validationErrors?.fieldErrors, 'email')
          }
        />
        <Button type="submit" className="h-11 md:h-9" disabled={isPending}>
          {isPending ? 'Enviando…' : 'Enviar el enlace'}
        </Button>
      </form>

      <EnlaceAcceso href={RUTAS.ingreso}>Volver al ingreso</EnlaceAcceso>
    </div>
  )
}
