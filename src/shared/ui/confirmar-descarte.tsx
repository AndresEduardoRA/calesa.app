'use client'

import { Button } from './button'

type Props = {
  alSeguir: () => void
  alDescartar: () => void
}

// El pie de un modal cuando se quiere cerrar con algo escrito: la pregunta va en el mismo modal, no
// en otro. «Seguir editando» nace con el foco: un Enter de más no tira nada.
export function ConfirmarDescarte({ alSeguir, alDescartar }: Props) {
  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
      <p role="alert" className="text-sm sm:mr-auto">
        Tienes cambios sin guardar.
      </p>
      <Button variant="destructive" className="order-last sm:order-none" onClick={alDescartar}>
        Descartar
      </Button>
      <Button autoFocus onClick={alSeguir}>
        Seguir editando
      </Button>
    </div>
  )
}
