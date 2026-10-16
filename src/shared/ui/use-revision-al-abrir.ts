'use client'

import { useEffect, useRef, useState } from 'react'
import { avisarError } from './toasts'

// Un modal abierto por la URL (`?panel=…&<clave>=<id>`) se revisa una vez, al llegar: si lo que nombra
// no se puede abrir (`motivo`), no se abre, se avisa y se limpia la URL (`cerrar`). Después ya no: lo
// que cambia con el modal abierto no lo cierra (el modal dice por qué ya no se guarda). `clave`
// identifica la apertura (nula = no hay nada que revisar); devuelve si esta apertura quedó rechazada.
export function useRevisionAlAbrir(
  clave: string | null,
  motivo: string | null,
  cerrar: () => void,
): boolean {
  const [aceptada, setAceptada] = useState<string | null>(null)
  if (clave !== null && clave !== aceptada && motivo === null) {
    setAceptada(clave)
  }
  const rechazada = clave !== null && clave !== aceptada && motivo !== null
  const alCerrar = useRef(cerrar)
  const avisada = useRef<string | null>(null)
  useEffect(() => {
    alCerrar.current = cerrar
  })
  useEffect(() => {
    if (rechazada && avisada.current !== clave) {
      avisada.current = clave
      avisarError({ codigo: 'no_encontrado', mensaje: motivo })
      alCerrar.current()
    }
  }, [rechazada, clave, motivo])
  return rechazada
}
