'use client'

import { useEffect, useRef } from 'react'
import { Button } from './button'

type Props = {
  alSeguir: () => void
  alDescartar: () => void
}

// El pie de un modal cuando se quiere cerrar con algo escrito: la pregunta va en el mismo modal, no
// en otro. «Seguir editando» nace con el foco: un Enter de más no tira nada. Si la pregunta la disparó
// el botón de un aviso («Abrir ficha»), sonner devuelve el foco a donde estaba antes de tocarlo (el
// campo) al salir de la lista de avisos: se lo vuelve a dar un cuadro después.
export function ConfirmarDescarte({ alSeguir, alDescartar }: Props) {
  const seguir = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const cuadro = requestAnimationFrame(() => {
      seguir.current?.focus()
    })
    return () => {
      cancelAnimationFrame(cuadro)
    }
  }, [])
  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
      <p role="alert" className="text-sm sm:mr-auto">
        Tienes cambios sin guardar.
      </p>
      <Button variant="destructive" className="order-last sm:order-none" onClick={alDescartar}>
        Descartar
      </Button>
      <Button ref={seguir} autoFocus onClick={alSeguir}>
        Seguir editando
      </Button>
    </div>
  )
}
