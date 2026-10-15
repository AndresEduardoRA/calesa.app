'use client'

import { useEffect, useRef } from 'react'
import { useEnLinea } from './use-en-linea'

// Al volver la conexión, el guardado que quedó esperando sale solo, una vez. Es seguro repetirlo:
// quien lo usa manda un id de intento o una versión, y guardar lo ya guardado no es un conflicto.
// `pendiente` es lo que hay que reenviar (nulo = nada espera) y tiene que ser estable entre
// renders: un objeto nuevo en cada uno volvería a disparar el envío.
//
// Sólo sale al pasar de sin conexión a con conexión. Si el envío falló con la red presente (el
// servidor no contestó, o la respuesta se perdió), no se reenvía solo: la pantalla ofrece
// «Reintentar». Reenviar en cuanto aparece lo pendiente era una carrera con `isPending` de la action
// que, cuando ganaba, guardaba sin que nadie lo pidiera y borraba el aviso.
export function useReintentoAlVolver<Pendiente>(
  pendiente: Pendiente | null,
  enviar: (pendiente: Pendiente) => Promise<boolean>,
): boolean {
  const enLinea = useEnLinea()
  const ultimo = useRef(enviar)
  const estabaEnLinea = useRef(enLinea)
  useEffect(() => {
    ultimo.current = enviar
  })
  useEffect(() => {
    const volvio = enLinea && !estabaEnLinea.current
    estabaEnLinea.current = enLinea
    if (volvio && pendiente !== null) {
      void ultimo.current(pendiente)
    }
  }, [enLinea, pendiente])
  return enLinea
}
