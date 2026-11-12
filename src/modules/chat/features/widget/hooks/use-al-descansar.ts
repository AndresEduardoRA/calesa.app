'use client'

import { useEffect, useState } from 'react'

// Verdadero cuando el navegador ya hidrató la pantalla y descansa (o tras `tope` ms, lo primero). Igual que el de `notificaciones` (un módulo no importa
// el de otro): el contador y su canal piden el cliente de Supabase recién entonces, y no retrasan el primer clic que vale.
export function useAlDescansar(tope = 3000): boolean {
  const [listo, setListo] = useState(false)
  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(
        () => {
          setListo(true)
        },
        { timeout: tope },
      )
      return () => {
        window.cancelIdleCallback(id)
      }
    }
    const id = window.setTimeout(() => {
      setListo(true)
    }, 200)
    return () => {
      window.clearTimeout(id)
    }
  }, [tope])
  return listo
}
