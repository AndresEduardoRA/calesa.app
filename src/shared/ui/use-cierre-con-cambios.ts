'use client'

import { useState } from 'react'

type Opciones = {
  // Si cerrar ahora perdería algo escrito.
  hayCambios: boolean
  alCerrar: () => void
  // Lo que se tira al descartar (el borrador). Se llama antes de cerrar.
  alDescartar?: () => void
}

export type CierreConCambios = {
  // Lo que el modal llama con Esc, la ✕, el clic afuera o «Cancelar». Sin cambios cierra; con cambios
  // pregunta en el pie (un `<Confirmar>` sería un modal sobre otro). Si ya está preguntando, vuelve
  // al formulario: Esc dos veces no tira nada.
  intentarCerrar: () => void
  confirmando: boolean
  seguir: () => void
  descartar: () => void
}

export function useCierreConCambios({
  hayCambios,
  alCerrar,
  alDescartar,
}: Opciones): CierreConCambios {
  const [confirmando, setConfirmando] = useState(false)

  function intentarCerrar() {
    if (confirmando) {
      setConfirmando(false)
      return
    }
    if (hayCambios) {
      setConfirmando(true)
      return
    }
    alCerrar()
  }

  function descartar() {
    setConfirmando(false)
    alDescartar?.()
    alCerrar()
  }

  return {
    intentarCerrar,
    confirmando,
    seguir: () => {
      setConfirmando(false)
    },
    descartar,
  }
}
