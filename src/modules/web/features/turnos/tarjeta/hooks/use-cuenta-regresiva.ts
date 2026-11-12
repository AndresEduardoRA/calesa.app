'use client'

import { useEffect, useState } from 'react'
import { cuentaRegresiva, type CuentaRegresiva } from '../../../../entities/turnos/cuenta-regresiva'

const CADA_MS = 30_000

// La cuenta regresiva de una tarjeta, viva: arranca con la hora que dio el servidor (así no hay desajuste de hidratación) y, ya montada, la sigue
// con el reloj del navegador cada 30 s. Sin `venceEn` (contacto directo) no hay reloj que seguir.
export function useCuentaRegresiva(
  venceEn: string | null,
  ahoraDelServidor: string,
): CuentaRegresiva {
  const [ahora, setAhora] = useState(ahoraDelServidor)
  useEffect(() => {
    if (venceEn === null) return
    const reloj = setInterval(() => {
      setAhora(new Date().toISOString())
    }, CADA_MS)
    return () => {
      clearInterval(reloj)
    }
  }, [venceEn])
  return cuentaRegresiva(venceEn, ahora)
}
