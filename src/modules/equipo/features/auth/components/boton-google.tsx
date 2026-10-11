'use client'

import { useAction } from 'next-safe-action/hooks'
import { errorDeAccion } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { ingresarConGoogle } from '../actions/ingresar-con-google'

// Sólo se dibuja si Auth tiene a Google encendido (lo decide la página). Lo que pase después,
// del lado de Google, vuelve por /auth/callback y se lee como un aviso en esta misma pantalla.
export function BotonGoogle({ returnTo }: { returnTo?: string }) {
  const { execute, result, isPending } = useAction(ingresarConGoogle)
  const error = errorDeAccion(result)

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-11 md:h-9"
        disabled={isPending}
        onClick={() => {
          execute({ returnTo })
        }}
      >
        {isPending ? 'Abriendo Google…' : 'Continuar con Google'}
      </Button>
      {error ? <Aviso tono="peligro">{error.mensaje}</Aviso> : null}
    </div>
  )
}
