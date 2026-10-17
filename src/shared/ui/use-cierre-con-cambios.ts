'use client'

import { useEffect, useState } from 'react'
import { anotarCambiosSinGuardar } from './salida-con-cambios'

type Opciones = {
  // Si cerrar ahora perdería algo escrito.
  hayCambios: boolean
  alCerrar: () => void
  // Lo que se tira al descartar (el borrador). Se llama antes de cerrar.
  alDescartar?: () => void
  // Abierto y con cambios, una salida desde afuera (la acción de un aviso) pregunta acá antes de irse
  // (`salirSinPerder()`). Sin esto, se lo da por abierto.
  abierto?: boolean
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
  abierto = true,
}: Opciones): CierreConCambios {
  const [confirmando, setConfirmando] = useState(false)
  // La salida que pidió alguien de afuera mientras se pregunta: sigue si se descarta.
  const [salida, setSalida] = useState<(() => void) | null>(null)

  // Si lo escrito se guardó o se deshizo mientras se preguntaba, ya no hay nada que preguntar (se ajusta al dibujar, no en un efecto).
  if (!hayCambios && (confirmando || salida !== null)) {
    setConfirmando(false)
    setSalida(null)
  }

  const anotado = abierto && hayCambios
  useEffect(() => {
    if (!anotado) {
      return
    }
    return anotarCambiosSinGuardar((salir) => {
      setSalida(() => salir)
      setConfirmando(true)
    })
  }, [anotado])

  function seguir() {
    setConfirmando(false)
    setSalida(null)
  }

  function intentarCerrar() {
    if (confirmando) {
      seguir()
      return
    }
    if (hayCambios) {
      setConfirmando(true)
      return
    }
    alCerrar()
  }

  // Con una salida pendiente no se cierra: irse desmonta el formulario, y cerrar escribe la URL (sin
  // `?panel=`) un instante después, pisando a dónde se iba.
  function descartar() {
    setConfirmando(false)
    setSalida(null)
    alDescartar?.()
    if (salida) {
      salida()
      return
    }
    alCerrar()
  }

  return { intentarCerrar, confirmando, seguir, descartar }
}
