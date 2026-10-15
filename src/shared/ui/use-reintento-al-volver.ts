'use client'

import { useEffect, useRef } from 'react'
import { useEnLinea } from './use-en-linea'

// Al volver la conexión, el guardado que quedó esperando sale solo, una vez. Es seguro repetirlo:
// quien lo usa manda un id de intento o una versión, y guardar lo ya guardado no es un conflicto.
// `pendiente` es lo que hay que reenviar (nulo = nada espera) y tiene que ser estable entre
// renders: un objeto nuevo en cada uno volvería a disparar el envío.
export function useReintentoAlVolver<Pendiente>(
  pendiente: Pendiente | null,
  enviar: (pendiente: Pendiente) => Promise<boolean>,
): boolean {
  const enLinea = useEnLinea()
  const ultimo = useRef(enviar)
  useEffect(() => {
    ultimo.current = enviar
  })
  useEffect(() => {
    if (enLinea && pendiente !== null) {
      void ultimo.current(pendiente)
    }
  }, [enLinea, pendiente])
  return enLinea
}
